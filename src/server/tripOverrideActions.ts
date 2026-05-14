import { getTrip } from '../data/trips/index.js'
import type { TripOverrideData, TripOverrideHistoryRow, TripOverrideRow } from '../utils/tripOverrides.js'
import {
  applyTripOverride,
  dynamicTripFromRow,
  normalizeTripOverrideData,
  tripVisibilityFromData,
  validateEditableTrip,
} from '../utils/tripOverrides.js'

type SaveBody = {
  action: 'save'
  tripSlug: string
  pin: string
  data: unknown
  updatedBy?: unknown
}

type RestoreBody = {
  action: 'restore'
  tripSlug: string
  pin: string
  version: number
  updatedBy?: unknown
}

type HistoryBody = {
  action: 'history'
  tripSlug: string
  pin: string
}

export type TripOverrideRequestBody = SaveBody | RestoreBody | HistoryBody

export type TripOverrideStore = {
  getCurrent: (tripSlug: string) => Promise<TripOverrideRow | null>
  upsertCurrent: (row: TripOverrideRow) => Promise<void>
  insertHistory: (row: Omit<TripOverrideHistoryRow, 'id'>) => Promise<void>
  getHistory: (tripSlug: string) => Promise<TripOverrideHistoryRow[]>
  getHistoryVersion: (tripSlug: string, version: number) => Promise<TripOverrideHistoryRow | null>
}

export type TripOverrideActionResult =
  | { status: number; body: { ok: true; row?: TripOverrideRow; history?: TripOverrideHistoryRow[]; mergedTrip?: unknown } }
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

function asPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function requestError(status: number, error: string): TripOverrideActionResult {
  return { status, body: { ok: false, error } }
}

function parseBody(body: unknown): TripOverrideRequestBody | null {
  if (!isRecord(body)) return null
  const action = body.action
  const tripSlug = asString(body.tripSlug)
  const pin = asString(body.pin)
  if (!tripSlug || !pin) return null

  if (action === 'save') {
    return {
      action,
      tripSlug,
      pin,
      data: body.data,
      updatedBy: body.updatedBy,
    }
  }

  if (action === 'restore') {
    const version = asPositiveInteger(body.version)
    if (!version) return null
    return {
      action,
      tripSlug,
      pin,
      version,
      updatedBy: body.updatedBy,
    }
  }

  if (action === 'history') {
    return { action, tripSlug, pin }
  }

  return null
}

function ownerName(value: unknown): string {
  return asString(value) ?? 'owner'
}

function rowForSave(
  tripSlug: string,
  version: number,
  data: TripOverrideData,
  updatedBy: string,
  source: 'seed' | 'dynamic',
  current?: TripOverrideRow | null,
): TripOverrideRow {
  return {
    trip_slug: tripSlug,
    data,
    version,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
    source,
    visibility: tripVisibilityFromData(data),
    ...(source === 'dynamic'
      ? {
          created_at: current?.created_at,
          created_by: current?.created_by,
        }
      : {}),
  }
}

async function nextVersion(store: TripOverrideStore, tripSlug: string): Promise<number> {
  const current = await store.getCurrent(tripSlug)
  return (current?.version ?? 0) + 1
}

export async function runTripOverrideAction(
  rawBody: unknown,
  store: TripOverrideStore,
  options: RunOptions,
): Promise<TripOverrideActionResult> {
  if (!options.adminPin && !options.editorPin) {
    return requestError(500, 'Owner editing is not configured.')
  }

  const body = parseBody(rawBody)
  if (!body) {
    return requestError(400, 'Invalid request body.')
  }

  const pinMatches = options.pinMatches ?? ((submitted, expected) => submitted === expected)
  const adminPinMatches = options.adminPin ? pinMatches(body.pin, options.adminPin) : false
  const editorPinMatches = options.editorPin ? pinMatches(body.pin, options.editorPin) : false
  if (!adminPinMatches && !editorPinMatches) {
    return requestError(401, 'Invalid owner PIN.')
  }

  const seed = getTrip(body.tripSlug)
  const current = await store.getCurrent(body.tripSlug)
  if (seed && !adminPinMatches) {
    return requestError(401, 'Invalid owner PIN.')
  }

  const dynamicTrip = seed ? null : dynamicTripFromRow(current)
  const baseTrip = seed ?? dynamicTrip
  if (!baseTrip) {
    return requestError(404, 'Trip not found.')
  }
  const rowSource: 'seed' | 'dynamic' = seed ? 'seed' : 'dynamic'

  if (body.action === 'history') {
    const history = await store.getHistory(body.tripSlug)
    return { status: 200, body: { ok: true, history } }
  }

  if (body.action === 'restore') {
    const historyRow = await store.getHistoryVersion(body.tripSlug, body.version)
    if (!historyRow) {
      return requestError(404, 'History version not found.')
    }

    const validationErrors = validateEditableTrip(baseTrip, historyRow.data)
    if (validationErrors.length > 0) {
      return {
        status: 400,
        body: {
          ok: false,
          error: 'Stored history version is no longer valid for this trip.',
          validationErrors: validationErrors.map(({ path, message }) => ({ path, message })),
        },
      }
    }

    const version = await nextVersion(store, body.tripSlug)
    const row = rowForSave(body.tripSlug, version, historyRow.data, ownerName(body.updatedBy), rowSource, current)
    await store.upsertCurrent(row)
    await store.insertHistory({ ...row, restored_from_version: historyRow.version })

    return {
      status: 200,
      body: {
        ok: true,
        row,
        history: await store.getHistory(body.tripSlug),
        mergedTrip: applyTripOverride(baseTrip, row.data),
      },
    }
  }

  const data = normalizeTripOverrideData(body.data)
  const validationErrors = validateEditableTrip(baseTrip, data)
  if (validationErrors.length > 0) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Trip edits need attention before saving.',
        validationErrors: validationErrors.map(({ path, message }) => ({ path, message })),
      },
    }
  }

  const version = await nextVersion(store, body.tripSlug)
  const row = rowForSave(body.tripSlug, version, data, ownerName(body.updatedBy), rowSource, current)
  await store.upsertCurrent(row)
  await store.insertHistory({ ...row, restored_from_version: null })

  return {
    status: 200,
    body: {
      ok: true,
      row,
      history: await store.getHistory(body.tripSlug),
      mergedTrip: applyTripOverride(baseTrip, row.data),
    },
  }
}
