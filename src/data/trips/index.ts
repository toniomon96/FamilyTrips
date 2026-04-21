import type { Trip } from '../../types/trip'
import { stpete } from './stpete'
import { okc } from './okc'

export const trips: Record<string, Trip> = {
  [stpete.slug]: stpete,
  [okc.slug]: okc,
}

export function getTrip(slug?: string): Trip | undefined {
  return slug ? trips[slug] : undefined
}

export function listTrips(): Trip[] {
  return Object.values(trips)
}

export function listTripsSorted(): Trip[] {
  const today = new Date().toISOString().slice(0, 10)
  const upcomingOrActive: Trip[] = []
  const past: Trip[] = []
  for (const t of listTrips()) {
    if (t.endDate >= today) upcomingOrActive.push(t)
    else past.push(t)
  }
  upcomingOrActive.sort((a, b) => a.startDate.localeCompare(b.startDate))
  past.sort((a, b) => b.startDate.localeCompare(a.startDate))
  return [...upcomingOrActive, ...past]
}
