import type { Trip } from '../../types/trip'
import { stpete } from './stpete.js'
import { okc } from './okc.js'
import { loganBachelor } from './logan-bachelor.js'
import { familyCookout } from './family-cookout.js'
import { mothersDay2026 } from './mothers-day-2026.js'
import { todayLocalISO } from '../../utils/formatters.js'

export const trips: Record<string, Trip> = {
  [stpete.slug]: stpete,
  [okc.slug]: okc,
  [loganBachelor.slug]: loganBachelor,
  [familyCookout.slug]: familyCookout,
  [mothersDay2026.slug]: mothersDay2026,
}

export function getTrip(slug?: string): Trip | undefined {
  return slug ? trips[slug] : undefined
}

export function listTrips(): Trip[] {
  return Object.values(trips)
}

export function listListedTrips(): Trip[] {
  return listTrips().filter((trip) => trip.visibility !== 'unlisted')
}

export function sortTripsForIndex(sourceTrips: Trip[]): Trip[] {
  const today = todayLocalISO()
  const upcomingOrActive: Trip[] = []
  const past: Trip[] = []
  for (const t of sourceTrips.filter((trip) => trip.visibility !== 'unlisted')) {
    if (t.endDate >= today) upcomingOrActive.push(t)
    else past.push(t)
  }
  upcomingOrActive.sort((a, b) => a.startDate.localeCompare(b.startDate))
  past.sort((a, b) => b.startDate.localeCompare(a.startDate))
  return [...upcomingOrActive, ...past]
}

export function listTripsSorted(): Trip[] {
  return sortTripsForIndex(listTrips())
}
