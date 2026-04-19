import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getTrip } from '../data/trips'
import { TripContext } from './tripContextCore'

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { tripSlug } = useParams<{ tripSlug?: string }>()
  const trip = useMemo(() => getTrip(tripSlug), [tripSlug])
  return <TripContext.Provider value={trip}>{children}</TripContext.Provider>
}
