import { getTrip } from '../data/trips/index.js'
import type { Trip } from '../types/trip.js'
import type { TripOverrideHistoryRow, TripOverrideRow } from '../utils/tripOverrides.js'
import { editableFieldsFromTrip, tripVisibilityFromData } from '../utils/tripOverrides.js'
import {
  generateSmartTrip,
  normalizeTripGenerationBrief,
  type TripAiPlanner,
  type TripGenerationSummary,
} from '../utils/tripGeneration.js'
import { validateTripForSave } from '../utils/tripShell.js'

type CreateBody = {
  action: 'create'
  pin: string
  trip: Trip
  createdBy?: unknown
}

type GenerateBody = {
  action: 'generate'
  pin: string
  brief: unknown
  createdBy?: unknown
}

type DeleteUatBody = {
  action: 'deleteUat'
  pin: string
  tripSlug: string
}

type TripActionBody = CreateBody | GenerateBody | DeleteUatBody

export type TripCreateStore = {
  getCurrent: (tripSlug: string) => Promise<TripOverrideRow | null>
  insertCurrent: (row: TripOverrideRow) => Promise<boolean>
  insertHistory: (row: Omit<TripOverrideHistoryRow, 'id'>) => Promise<void>
  deleteUatTrip: (tripSlug: string) => Promise<boolean>
}

export type TripCreateActionResult =
  | { status: number; body: { ok: true; trip: Trip; row: TripOverrideRow; generationSummary?: TripGenerationSummary } }
  | { status: number; body: { ok: true; deleted: true; tripSlug: string } }
  | {
      status: number
      body: {
        ok: false
        error: string
        validationErrors?: { path: string; message: string }[]
      }
    }

type RunOptions = {
  adminPin?: string
  editorPin?: string
  aiPlanner?: TripAiPlanner
  pinMatches?: (submitted: string, expected: string) => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function parseBody(body: unknown): TripActionBody | null {
  if (!isRecord(body)) return null
  const pin = asString(body.pin)
  if (!pin) return null
  if (body.action === 'create' && isRecord(body.trip)) {
    return {
      action: 'create',
      pin,
      trip: body.trip as Trip,
      createdBy: body.createdBy,
    }
  }
  if (body.action === 'generate') {
    return {
      action: 'generate',
      pin,
      brief: body.brief,
      createdBy: body.createdBy,
    }
  }
  if (body.action === 'deleteUat') {
    const tripSlug = asString(body.tripSlug)
    if (!tripSlug) return null
    return {
      action: 'deleteUat',
      pin,
      tripSlug,
    }
  }
  return null
}

function requestError(status: number, error: string): TripCreateActionResult {
  return { status, body: { ok: false, error } }
}

function actorName(value: unknown): string {
  return asString(value) ?? 'creator'
}

function isCodexUatRow(tripSlug: string, row: TripOverrideRow): boolean {
  return row.source === 'dynamic' && tripSlug.startsWith('codex-uat-') && row.created_by === 'Codex UAT'
}

async function writeDynamicTrip(
  trip: Trip,
  createdBy: unknown,
  store: TripCreateStore,
  generationSummary?: TripGenerationSummary,
): Promise<TripCreateActionResult> {
  const validationErrors = validateTripForSave(trip)
  if (validationErrors.length > 0) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Trip needs attention before it can be created.',
        validationErrors: validationErrors.map(({ path, message }) => ({ path, message })),
      },
    }
  }

  if (getTrip(trip.slug) || (await store.getCurrent(trip.slug))) {
    return requestError(409, 'A trip with this URL already exists.')
  }

  const data = editableFieldsFromTrip(trip)
  const now = new Date().toISOString()
  const row: TripOverrideRow = {
    trip_slug: trip.slug,
    data,
    version: 1,
    updated_at: now,
    updated_by: actorName(createdBy),
    source: 'dynamic',
    visibility: tripVisibilityFromData(data),
    created_at: now,
    created_by: actorName(createdBy),
  }

  const inserted = await store.insertCurrent(row)
  if (!inserted) {
    return requestError(409, 'A trip with this URL already exists.')
  }

  await store.insertHistory({ ...row, restored_from_version: null })

  return {
    status: 200,
    body: generationSummary ? { ok: true, trip, row, generationSummary } : { ok: true, trip, row },
  }
}

export async function runTripCreateAction(
  rawBody: unknown,
  store: TripCreateStore,
  options: RunOptions,
): Promise<TripCreateActionResult> {
  if (!options.adminPin && !options.editorPin) {
    return requestError(500, 'Trip creation is not configured.')
  }

  const body = parseBody(rawBody)
  if (!body) {
    return requestError(400, 'Invalid request body.')
  }

  const pinMatches = options.pinMatches ?? ((submitted, expected) => submitted === expected)
  const adminPinMatches = options.adminPin ? pinMatches(body.pin, options.adminPin) : false
  const editorPinMatches = options.editorPin ? pinMatches(body.pin, options.editorPin) : false
  if (!adminPinMatches && !editorPinMatches) {
    return requestError(401, 'Invalid trip edit PIN.')
  }

  if (body.action === 'deleteUat') {
    const row = await store.getCurrent(body.tripSlug)
    if (!row) {
      return requestError(404, 'UAT trip not found.')
    }
    if (!isCodexUatRow(body.tripSlug, row)) {
      return requestError(403, 'Only Codex UAT dynamic test trips can be deleted by this action.')
    }
    const deleted = await store.deleteUatTrip(body.tripSlug)
    if (!deleted) {
      return requestError(409, 'UAT trip could not be deleted safely.')
    }
    return { status: 200, body: { ok: true, deleted: true, tripSlug: body.tripSlug } }
  }

  if (body.action === 'generate') {
    const normalized = normalizeTripGenerationBrief(body.brief)
    if (!normalized.ok) {
      return {
        status: 400,
        body: {
          ok: false,
          error: 'Trip needs attention before it can be generated.',
          validationErrors: normalized.validationErrors,
        },
      }
    }
    if (getTrip(normalized.brief.slug) || (await store.getCurrent(normalized.brief.slug))) {
      return requestError(409, 'A trip with this URL already exists.')
    }
    const generated = await generateSmartTrip(normalized.brief, { aiPlanner: options.aiPlanner })
    return writeDynamicTrip(generated.trip, body.createdBy || normalized.brief.createdBy, store, generated.generationSummary)
  }

  return writeDynamicTrip(body.trip, body.createdBy, store)
}
