import { getTrip } from '../data/trips/index.js'
import type { Trip } from '../types/trip.js'
import type { TripOverrideHistoryRow, TripOverrideRow } from '../utils/tripOverrides.js'
import { editableFieldsFromTrip, tripVisibilityFromData } from '../utils/tripOverrides.js'
import { validateTripForSave } from '../utils/tripShell.js'

type CreateBody = {
  action: 'create'
  pin: string
  trip: Trip
  createdBy?: unknown
}

export type TripCreateStore = {
  getCurrent: (tripSlug: string) => Promise<TripOverrideRow | null>
  upsertCurrent: (row: TripOverrideRow) => Promise<void>
  insertHistory: (row: Omit<TripOverrideHistoryRow, 'id'>) => Promise<void>
}

export type TripCreateActionResult =
  | { status: number; body: { ok: true; trip: Trip; row: TripOverrideRow } }
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
  pinMatches?: (submitted: string, expected: string) => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function parseBody(body: unknown): CreateBody | null {
  if (!isRecord(body) || body.action !== 'create' || !isRecord(body.trip)) return null
  const pin = asString(body.pin)
  if (!pin) return null
  return {
    action: 'create',
    pin,
    trip: body.trip as Trip,
    createdBy: body.createdBy,
  }
}

function requestError(status: number, error: string): TripCreateActionResult {
  return { status, body: { ok: false, error } }
}

function actorName(value: unknown): string {
  return asString(value) ?? 'creator'
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

  const validationErrors = validateTripForSave(body.trip)
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

  if (getTrip(body.trip.slug) || (await store.getCurrent(body.trip.slug))) {
    return requestError(409, 'A trip with this URL already exists.')
  }

  const data = editableFieldsFromTrip(body.trip)
  const now = new Date().toISOString()
  const row: TripOverrideRow = {
    trip_slug: body.trip.slug,
    data,
    version: 1,
    updated_at: now,
    updated_by: actorName(body.createdBy),
    source: 'dynamic',
    visibility: tripVisibilityFromData(data),
    created_at: now,
    created_by: actorName(body.createdBy),
  }

  await store.upsertCurrent(row)
  await store.insertHistory({ ...row, restored_from_version: null })

  return { status: 200, body: { ok: true, trip: body.trip, row } }
}
