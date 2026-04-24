import type { Trip } from '../../types/trip'
import { stpete } from './stpete'
import { okc } from './okc'
import { loganBachelor } from './logan-bachelor'

export const trips: Record<string, Trip> = {
  [stpete.slug]: stpete,
  [okc.slug]: okc,
  [loganBachelor.slug]: loganBachelor,
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

function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
