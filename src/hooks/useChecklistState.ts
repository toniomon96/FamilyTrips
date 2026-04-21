import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase, type ChecklistStateRow } from '../lib/supabase'

export type ChecklistStatus = 'online' | 'offline' | 'saving' | 'error'

export type ChecklistStateEntry = {
  done: boolean
  updated_at: string
  actor_id: string | null
}

type ToggleResult = {
  dbRows: Map<string, ChecklistStateEntry>
  status: ChecklistStatus
  toggle: (itemId: string, nextDone: boolean) => void
}

function mergeRow(
  prev: Map<string, ChecklistStateEntry>,
  row: ChecklistStateRow,
): Map<string, ChecklistStateEntry> {
  const existing = prev.get(row.item_id)
  if (existing && existing.updated_at >= row.updated_at) return prev
  const next = new Map(prev)
  next.set(row.item_id, {
    done: row.done,
    updated_at: row.updated_at,
    actor_id: row.actor_id,
  })
  return next
}

export function useChecklistState(tripSlug: string, actorId: string | null): ToggleResult {
  const [dbRows, setDbRows] = useState<Map<string, ChecklistStateEntry>>(() => new Map())
  const [status, setStatus] = useState<ChecklistStatus>(() =>
    isSupabaseConfigured ? 'online' : 'offline',
  )
  const inFlight = useRef<Set<string>>(new Set())
  const writesOutstanding = useRef(0)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let cancelled = false
    const sb = supabase

    const channel = sb
      .channel(`checklist_state:${tripSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_state',
          filter: `trip_slug=eq.${tripSlug}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as ChecklistStateRow | undefined
          if (!row) return
          if (payload.eventType === 'DELETE') {
            setDbRows((prev) => {
              if (!prev.has(row.item_id)) return prev
              const next = new Map(prev)
              next.delete(row.item_id)
              return next
            })
            return
          }
          setDbRows((prev) => mergeRow(prev, row))
        },
      )
      .subscribe((subStatus) => {
        if (cancelled) return
        if (subStatus === 'SUBSCRIBED') {
          if (writesOutstanding.current === 0) setStatus('online')
        } else if (
          subStatus === 'CHANNEL_ERROR' ||
          subStatus === 'TIMED_OUT' ||
          subStatus === 'CLOSED'
        ) {
          setStatus('offline')
        }
      })

    sb.from('checklist_state')
      .select('*')
      .eq('trip_slug', tripSlug)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setStatus('offline')
          return
        }
        setDbRows((prev) => {
          let next = prev
          for (const row of (data ?? []) as ChecklistStateRow[]) {
            next = mergeRow(next, row)
          }
          return next
        })
      })

    return () => {
      cancelled = true
      sb.removeChannel(channel)
    }
  }, [tripSlug])

  const toggle = useCallback(
    (itemId: string, nextDone: boolean) => {
      const sb = supabase
      if (!isSupabaseConfigured || !sb) {
        const now = new Date().toISOString()
        setDbRows((prev) => {
          const next = new Map(prev)
          next.set(itemId, { done: nextDone, updated_at: now, actor_id: actorId })
          return next
        })
        return
      }

      if (inFlight.current.has(itemId)) return
      inFlight.current.add(itemId)

      const optimisticAt = new Date().toISOString()
      const previous = dbRows.get(itemId)

      setDbRows((prev) => {
        const next = new Map(prev)
        next.set(itemId, {
          done: nextDone,
          updated_at: optimisticAt,
          actor_id: actorId,
        })
        return next
      })

      writesOutstanding.current += 1
      setStatus('saving')

      sb.from('checklist_state')
        .upsert(
          {
            trip_slug: tripSlug,
            item_id: itemId,
            done: nextDone,
            actor_id: actorId,
          },
          { onConflict: 'trip_slug,item_id' },
        )
        .then(({ error }) => {
          inFlight.current.delete(itemId)
          writesOutstanding.current = Math.max(0, writesOutstanding.current - 1)

          if (error) {
            setDbRows((prev) => {
              const next = new Map(prev)
              if (previous) next.set(itemId, previous)
              else next.delete(itemId)
              return next
            })
            setStatus('error')
            return
          }

          if (writesOutstanding.current === 0) setStatus('online')
        })
    },
    [tripSlug, actorId, dbRows],
  )

  return { dbRows, status, toggle }
}
