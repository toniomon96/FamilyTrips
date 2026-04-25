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

type ScopedRows = {
  tripSlug: string
  rows: Map<string, ChecklistStateEntry>
}

const LOCAL_STATE_PREFIX = 'familytrips:checklist-state:'
const EMPTY_ROWS = new Map<string, ChecklistStateEntry>()

function localStateKey(tripSlug: string): string {
  return LOCAL_STATE_PREFIX + tripSlug
}

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function readLocalState(tripSlug: string): Map<string, ChecklistStateEntry> {
  if (!hasSessionStorage()) return new Map()
  try {
    const raw = window.sessionStorage.getItem(localStateKey(tripSlug))
    if (!raw) return new Map()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Map()

    const entries = parsed.filter((entry): entry is [string, ChecklistStateEntry] => {
      if (!Array.isArray(entry) || entry.length !== 2) return false
      const [itemId, state] = entry
      return (
        typeof itemId === 'string' &&
        typeof state === 'object' &&
        state !== null &&
        typeof state.done === 'boolean' &&
        typeof state.updated_at === 'string' &&
        (typeof state.actor_id === 'string' || state.actor_id === null)
      )
    })

    return new Map(entries)
  } catch {
    return new Map()
  }
}

function writeLocalState(tripSlug: string, rows: Map<string, ChecklistStateEntry>): void {
  if (!hasSessionStorage()) return
  try {
    window.sessionStorage.setItem(localStateKey(tripSlug), JSON.stringify([...rows.entries()]))
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

export function rowsToStateMap(
  rows: Pick<ChecklistStateRow, 'item_id' | 'done' | 'updated_at' | 'actor_id'>[],
): Map<string, ChecklistStateEntry> {
  let next = new Map<string, ChecklistStateEntry>()
  for (const row of rows) {
    next = mergeRow(next, row)
  }
  return next
}

function mergeRow(
  prev: Map<string, ChecklistStateEntry>,
  row: Pick<ChecklistStateRow, 'item_id' | 'done' | 'updated_at' | 'actor_id'>,
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
  const [rowState, setRowState] = useState<ScopedRows>(() => ({
    tripSlug,
    rows: isSupabaseConfigured ? new Map() : readLocalState(tripSlug),
  }))
  const [status, setStatus] = useState<ChecklistStatus>(() =>
    isSupabaseConfigured ? 'online' : 'offline',
  )
  const inFlight = useRef<Set<string>>(new Set())
  const writesOutstanding = useRef(0)
  const dbRows = rowState.tripSlug === tripSlug ? rowState.rows : EMPTY_ROWS

  useEffect(() => {
    if (isSupabaseConfigured) return
    const timeout = window.setTimeout(() => {
      setRowState({ tripSlug, rows: readLocalState(tripSlug) })
      setStatus('offline')
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [tripSlug])

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
            setRowState((prev) => {
              const rows = prev.tripSlug === tripSlug ? prev.rows : new Map()
              if (!rows.has(row.item_id)) return { tripSlug, rows }
              const next = new Map(rows)
              next.delete(row.item_id)
              return { tripSlug, rows: next }
            })
            return
          }
          setRowState((prev) => {
            const rows = prev.tripSlug === tripSlug ? prev.rows : new Map()
            return { tripSlug, rows: mergeRow(rows, row) }
          })
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
        setRowState({ tripSlug, rows: rowsToStateMap((data ?? []) as ChecklistStateRow[]) })
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
        setRowState((prev) => {
          const rows = prev.tripSlug === tripSlug ? prev.rows : new Map()
          const next = new Map(rows)
          next.set(itemId, { done: nextDone, updated_at: now, actor_id: actorId })
          writeLocalState(tripSlug, next)
          return { tripSlug, rows: next }
        })
        return
      }

      if (inFlight.current.has(itemId)) return
      inFlight.current.add(itemId)

      const optimisticAt = new Date().toISOString()
      const previous = dbRows.get(itemId)

      setRowState((prev) => {
        const rows = prev.tripSlug === tripSlug ? prev.rows : new Map()
        const next = new Map(rows)
        next.set(itemId, {
          done: nextDone,
          updated_at: optimisticAt,
          actor_id: actorId,
        })
        return { tripSlug, rows: next }
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
            setRowState((prev) => {
              const rows = prev.tripSlug === tripSlug ? prev.rows : new Map()
              const next = new Map(rows)
              if (previous) next.set(itemId, previous)
              else next.delete(itemId)
              return { tripSlug, rows: next }
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
