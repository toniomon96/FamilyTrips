import type { Trip } from '../types/trip'
import { validateTripData, type TripDataValidationError } from './validateTripData'

export type TripEditableFields = Omit<Trip, 'slug'>

export type TripOverrideData = Partial<TripEditableFields> & {
  slug?: unknown
}

export type TripOverrideRow = {
  trip_slug: string
  data: TripOverrideData
  version: number
  updated_at: string
  updated_by: string | null
}

export type TripOverrideHistoryRow = TripOverrideRow & {
  id: string
  restored_from_version: number | null
}

const EDITABLE_KEYS = [
  'kind',
  'name',
  'location',
  'startDate',
  'endDate',
  'visibility',
  'heroImage',
  'currency',
  'tagline',
  'stay',
  'bookings',
  'itinerary',
  'thingsToDo',
  'people',
  'contacts',
  'checklist',
  'packing',
  'food',
  'supplies',
  'eventTasks',
  'copyBlocks',
  'budget',
  'map',
] as const satisfies readonly (keyof TripEditableFields)[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function cloneTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function editableFieldsFromTrip(trip: Trip): TripEditableFields {
  const editable = cloneTrip(trip) as Partial<Trip>
  delete editable.slug
  return editable as TripEditableFields
}

export function normalizeTripOverrideData(input: unknown): TripOverrideData {
  if (!isRecord(input)) return {}

  const next: TripOverrideData = {}
  for (const key of EDITABLE_KEYS) {
    if (Object.hasOwn(input, key)) {
      ;(next as Record<string, unknown>)[key] = input[key]
    }
  }
  return cloneTrip(next)
}

export function applyTripOverride(seed: Trip, override?: unknown): Trip {
  const data = normalizeTripOverrideData(override)
  return {
    ...cloneTrip(seed),
    ...data,
    slug: seed.slug,
  }
}

export function validateEditableTrip(
  seed: Trip,
  editable: unknown,
): TripDataValidationError[] {
  try {
    return validateTripData([applyTripOverride(seed, editable)])
  } catch {
    return [
      {
        tripSlug: seed.slug,
        path: 'data',
        message: 'Trip data has an invalid shape.',
      },
    ]
  }
}

function slugifyIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
}

export function makeStableIdFromLabel(
  prefix: string,
  label: string,
  existingIds: Iterable<string>,
): string {
  const base = slugifyIdPart(label) || 'item'
  const used = new Set(existingIds)
  let candidate = `${prefix}-${base}`
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${prefix}-${base}-${suffix}`
    suffix += 1
  }
  return candidate
}
