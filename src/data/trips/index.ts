import type { Trip } from '../../types/trip'
import { tuscany } from './tuscany'

export const trips: Record<string, Trip> = {
  [tuscany.slug]: tuscany,
}

export const DEFAULT_TRIP_SLUG = tuscany.slug

export function getTrip(slug?: string): Trip {
  if (slug && trips[slug]) return trips[slug]
  return trips[DEFAULT_TRIP_SLUG]
}

export function listTrips(): Trip[] {
  return Object.values(trips)
}
