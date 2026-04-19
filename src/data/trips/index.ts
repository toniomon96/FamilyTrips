import type { Trip } from '../../types/trip'
import { stpete } from './stpete'

export const trips: Record<string, Trip> = {
  [stpete.slug]: stpete,
}

export const DEFAULT_TRIP_SLUG = stpete.slug

export function getTrip(slug?: string): Trip {
  if (slug && trips[slug]) return trips[slug]
  return trips[DEFAULT_TRIP_SLUG]
}

export function listTrips(): Trip[] {
  return Object.values(trips)
}
