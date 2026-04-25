import type { Trip } from '../../types/trip'
import { stpete } from './stpete'
import { okc } from './okc'
import { loganBachelor } from './logan-bachelor'
import { familyCookout } from './family-cookout'
import { mothersDay2026 } from './mothers-day-2026'
import { todayLocalISO } from '../../utils/formatters'

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

export function listTripsSorted(): Trip[] {
  const today = todayLocalISO()
  const upcomingOrActive: Trip[] = []
  const past: Trip[] = []
  for (const t of listListedTrips()) {
    if (t.endDate >= today) upcomingOrActive.push(t)
    else past.push(t)
  }
  upcomingOrActive.sort((a, b) => a.startDate.localeCompare(b.startDate))
  past.sort((a, b) => b.startDate.localeCompare(a.startDate))
  return [...upcomingOrActive, ...past]
}
