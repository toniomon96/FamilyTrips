import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase, type ChecklistItemRow, type ChecklistStateRow } from '../lib/supabase'
import type { Trip } from '../types/trip'

export type TripProgress = { done: number; total: number }

export function useAllTripsProgress(trips: Trip[]): Map<string, TripProgress> {
  const [progress, setProgress] = useState<Map<string, TripProgress>>(() => {
    // seed from code-defined done flags so we show something even pre-fetch
    const seed = new Map<string, TripProgress>()
    for (const t of trips) {
      const codeItems = [...t.checklist, ...(t.eventTasks ?? [])]
      const done = codeItems.filter((i) => i.done).length
      seed.set(t.slug, { done, total: codeItems.length })
    }
    return seed
  })

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const tripSlugs = trips.map((trip) => trip.slug)
    if (tripSlugs.length === 0) return

    let cancelled = false
    const sb = supabase

    Promise.all([
      sb.from('checklist_state').select('trip_slug,item_id,done').in('trip_slug', tripSlugs),
      sb.from('checklist_items').select('id,trip_slug').in('trip_slug', tripSlugs),
    ]).then(([stateRes, itemsRes]) => {
      if (cancelled) return

      const stateRows = ((stateRes.data ?? []) as Pick<
        ChecklistStateRow,
        'trip_slug' | 'item_id' | 'done'
      >[])
      const dbItemRows = ((itemsRes.data ?? []) as Pick<ChecklistItemRow, 'id' | 'trip_slug'>[])

      const next = new Map<string, TripProgress>()

      for (const trip of trips) {
        const stateForTrip = new Map<string, boolean>()
        for (const row of stateRows) {
          if (row.trip_slug === trip.slug) stateForTrip.set(row.item_id, row.done)
        }
        const dbItemsForTrip = dbItemRows.filter((r) => r.trip_slug === trip.slug)

        let done = 0
        let total = 0

        for (const codeItem of [...trip.checklist, ...(trip.eventTasks ?? [])]) {
          total += 1
          const override = stateForTrip.get(codeItem.id)
          const effectiveDone = override ?? codeItem.done
          if (effectiveDone) done += 1
        }

        for (const dbItem of dbItemsForTrip) {
          total += 1
          if (stateForTrip.get(dbItem.id) === true) done += 1
        }

        next.set(trip.slug, { done, total })
      }

      setProgress(next)
    })

    return () => {
      cancelled = true
    }
  }, [trips])

  return progress
}
