import { useCallback, useEffect, useMemo, useState } from 'react'
import { sortTripsForIndex } from '../data/trips'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Trip } from '../types/trip'
import { applyTripOverride, type TripOverrideRow } from '../utils/tripOverrides'

type OverrideStatus = 'offline' | 'loading' | 'online' | 'error'

type OverrideState = {
  rows: Map<string, TripOverrideRow>
  status: OverrideStatus
}

const EMPTY_ROWS = new Map<string, TripOverrideRow>()

function rowsToMap(rows: TripOverrideRow[]): Map<string, TripOverrideRow> {
  const next = new Map<string, TripOverrideRow>()
  for (const row of rows) next.set(row.trip_slug, row)
  return next
}

async function fetchOverrideRows(tripSlugs: string[]): Promise<TripOverrideRow[]> {
  if (!isSupabaseConfigured || !supabase || tripSlugs.length === 0) return []
  const { data, error } = await supabase
    .from('trip_overrides')
    .select('trip_slug,data,version,updated_at,updated_by')
    .in('trip_slug', tripSlugs)
  if (error) throw error
  return (data ?? []) as TripOverrideRow[]
}

export function useTripWithOverride(seedTrip: Trip | undefined): {
  trip: Trip | undefined
  status: OverrideStatus
  row: TripOverrideRow | null
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<OverrideState>({ rows: EMPTY_ROWS, status: 'offline' })
  const tripSlug = seedTrip?.slug

  const refresh = useCallback(async () => {
    if (!tripSlug || !isSupabaseConfigured) {
      setState({ rows: EMPTY_ROWS, status: 'offline' })
      return
    }

    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const rows = await fetchOverrideRows([tripSlug])
      setState({ rows: rowsToMap(rows), status: 'online' })
    } catch {
      setState((prev) => ({ ...prev, status: 'error' }))
    }
  }, [tripSlug])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [refresh])

  useEffect(() => {
    function onChanged(event: Event) {
      const detail = (event as CustomEvent<{ tripSlug?: string }>).detail
      if (!detail?.tripSlug || detail.tripSlug === tripSlug) void refresh()
    }

    window.addEventListener('familytrips:trip-overrides-changed', onChanged)
    return () => window.removeEventListener('familytrips:trip-overrides-changed', onChanged)
  }, [refresh, tripSlug])

  const row = tripSlug ? state.rows.get(tripSlug) ?? null : null
  const trip = useMemo(
    () => (seedTrip ? applyTripOverride(seedTrip, row?.data) : undefined),
    [seedTrip, row],
  )

  return { trip, status: state.status, row, refresh }
}

export function useTripsWithOverrides(seedTrips: Trip[]): {
  trips: Trip[]
  status: OverrideStatus
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<OverrideState>({ rows: EMPTY_ROWS, status: 'offline' })
  const tripSlugs = useMemo(() => seedTrips.map((trip) => trip.slug), [seedTrips])
  const tripSlugKey = tripSlugs.join('|')

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState({ rows: EMPTY_ROWS, status: 'offline' })
      return
    }

    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const rows = await fetchOverrideRows(tripSlugs)
      setState({ rows: rowsToMap(rows), status: 'online' })
    } catch {
      setState((prev) => ({ ...prev, status: 'error' }))
    }
  }, [tripSlugs])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [refresh, tripSlugKey])

  useEffect(() => {
    function onChanged() {
      void refresh()
    }

    window.addEventListener('familytrips:trip-overrides-changed', onChanged)
    return () => window.removeEventListener('familytrips:trip-overrides-changed', onChanged)
  }, [refresh])

  const trips = useMemo(
    () =>
      sortTripsForIndex(
        seedTrips.map((trip) => applyTripOverride(trip, state.rows.get(trip.slug)?.data)),
      ),
    [seedTrips, state.rows],
  )

  return { trips, status: state.status, refresh }
}
