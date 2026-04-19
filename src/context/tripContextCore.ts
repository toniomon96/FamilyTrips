import { createContext, useContext } from 'react'
import type { Trip } from '../types/trip'

export const TripContext = createContext<Trip | null>(null)

export function useTrip(): Trip {
  const trip = useContext(TripContext)
  if (!trip) throw new Error('useTrip must be used inside a TripProvider')
  return trip
}
