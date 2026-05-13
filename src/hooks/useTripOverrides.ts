import { useCallback, useEffect, useMemo, useState } from 'react'
import { sortTripsForIndex } from '../data/trips'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Trip } from '../types/trip'
import {
  applyTripOverride,
  dynamicTripFromRow,
  TRIP_OVERRIDE_SELECT,
  type TripOverrideRow,
} from '../utils/tripOverrides'

type OverrideStatus = 'offline' | 'loading' | 'online' | 'error' | 'not-found'

type OverrideState = {
  rows: Map<string, TripOverrideRow>
  status: OverrideStatus
  key: string
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
    .select(TRIP_OVERRIDE_SELECT)
    .in('trip_slug', tripSlugs)
  if (error) throw error
  return (data ?? []) as TripOverrideRow[]
}

async function fetchOverrideRow(tripSlug: string): Promise<TripOverrideRow | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from('trip_overrides')
    .select(TRIP_OVERRIDE_SELECT)
    .eq('trip_slug', tripSlug)
    .maybeSingle()
  if (error) throw error
  return (data as TripOverrideRow | null) ?? null
}

async function fetchListedDynamicTripRows(): Promise<TripOverrideRow[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('trip_overrides')
    .select(TRIP_OVERRIDE_SELECT)
    .eq('source', 'dynamic')
    .eq('visibility', 'listed')
  if (error) throw error
  return (data ?? []) as TripOverrideRow[]
}

export function useTripWithOverride(seedTrip: Trip | undefined): {
  trip: Trip | undefined
  status: OverrideStatus
  row: TripOverrideRow | null
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<OverrideState>({ rows: EMPTY_ROWS, status: 'offline', key: '' })
  const tripSlug = seedTrip?.slug

  const refresh = useCallback(async () => {
    if (!tripSlug || !isSupabaseConfigured) {
      setState({ rows: EMPTY_ROWS, status: 'offline', key: tripSlug ?? '' })
      return
    }

    setState((prev) => ({ ...prev, status: 'loading', key: tripSlug }))
    try {
      const rows = await fetchOverrideRows([tripSlug])
      setState({ rows: rowsToMap(rows), status: 'online', key: tripSlug })
    } catch {
      setState((prev) => ({ ...prev, status: 'error', key: tripSlug }))
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

  const status = state.key === (tripSlug ?? '') ? state.status : 'loading'
  const row = tripSlug && state.key === tripSlug ? state.rows.get(tripSlug) ?? null : null
  const trip = useMemo(
    () => (seedTrip ? applyTripOverride(seedTrip, row?.data) : undefined),
    [seedTrip, row],
  )

  return { trip, status, row, refresh }
}

export function useResolvedTrip(tripSlug: string | undefined): {
  trip: Trip | undefined
  status: OverrideStatus
  row: TripOverrideRow | null
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<OverrideState>({ rows: EMPTY_ROWS, status: 'offline', key: '' })
  const key = tripSlug ?? ''

  const refresh = useCallback(async () => {
    if (!tripSlug) {
      setState({ rows: EMPTY_ROWS, status: 'not-found', key })
      return
    }

    setState((prev) => ({ ...prev, status: 'loading', key }))
    try {
      const row = await fetchOverrideRow(tripSlug)
      if (!row || row.source !== 'dynamic') {
        setState({ rows: EMPTY_ROWS, status: 'not-found', key })
        return
      }
      setState({ rows: rowsToMap([row]), status: 'online', key })
    } catch {
      setState((prev) => ({ ...prev, status: 'error', key }))
    }
  }, [key, tripSlug])

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

  const status = state.key === key ? state.status : 'loading'
  const row = tripSlug && state.key === key ? state.rows.get(tripSlug) ?? null : null
  const trip = useMemo(() => dynamicTripFromRow(row) ?? undefined, [row])

  return { trip, status, row, refresh }
}

export function useTripsWithOverrides(seedTrips: Trip[]): {
  trips: Trip[]
  status: OverrideStatus
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<OverrideState>({ rows: EMPTY_ROWS, status: 'offline', key: '' })
  const tripSlugs = useMemo(() => seedTrips.map((trip) => trip.slug), [seedTrips])
  const tripSlugKey = tripSlugs.join('|')

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState({ rows: EMPTY_ROWS, status: 'offline', key: tripSlugKey })
      return
    }

    setState((prev) => ({ ...prev, status: 'loading', key: tripSlugKey }))
    try {
      const [seedRows, dynamicRows] = await Promise.all([
        fetchOverrideRows(tripSlugs),
        fetchListedDynamicTripRows(),
      ])
      setState({ rows: rowsToMap([...seedRows, ...dynamicRows]), status: 'online', key: tripSlugKey })
    } catch {
      setState((prev) => ({ ...prev, status: 'error', key: tripSlugKey }))
    }
  }, [tripSlugKey, tripSlugs])

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

  const status = state.key === tripSlugKey ? state.status : 'loading'
  const trips = useMemo(() => {
    const seedTripList = seedTrips.map((trip) => applyTripOverride(trip, state.rows.get(trip.slug)?.data))
    const seedSlugs = new Set(seedTrips.map((trip) => trip.slug))
    const dynamicTrips = [...state.rows.values()]
      .filter((row) => row.source === 'dynamic' && !seedSlugs.has(row.trip_slug))
      .map((row) => dynamicTripFromRow(row))
      .filter((trip): trip is Trip => Boolean(trip))
    return sortTripsForIndex([...seedTripList, ...dynamicTrips])
  }, [seedTrips, state.rows])

  return { trips, status, refresh }
}
