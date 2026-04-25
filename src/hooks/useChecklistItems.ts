import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase, type ChecklistItemRow } from '../lib/supabase'

export type AddItemInput = {
  title: string
  category: string
  notes?: string | null
}

type UseChecklistItemsResult = {
  items: ChecklistItemRow[]
  syncEnabled: boolean
  addItem: (input: AddItemInput) => Promise<ChecklistItemRow | null>
  updateItem: (id: string, patch: Partial<AddItemInput>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

const LOCAL_ITEMS_PREFIX = 'familytrips:checklist-items:'

function localItemsKey(tripSlug: string): string {
  return LOCAL_ITEMS_PREFIX + tripSlug
}

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function readLocalItems(tripSlug: string): ChecklistItemRow[] {
  if (!hasSessionStorage()) return []
  try {
    const raw = window.sessionStorage.getItem(localItemsKey(tripSlug))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ChecklistItemRow[]) : []
  } catch {
    return []
  }
}

function writeLocalItems(tripSlug: string, items: ChecklistItemRow[]): void {
  if (!hasSessionStorage()) return
  try {
    window.sessionStorage.setItem(localItemsKey(tripSlug), JSON.stringify(items))
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
}

function createLocalItem(
  tripSlug: string,
  actorId: string | null,
  input: AddItemInput,
): ChecklistItemRow {
  const now = new Date().toISOString()
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    trip_slug: tripSlug,
    title: input.title.trim(),
    category: input.category.trim() || 'Other',
    notes: input.notes?.trim() || null,
    created_at: now,
    created_by_actor_id: actorId,
  }
}

export function useChecklistItems(
  tripSlug: string,
  actorId: string | null,
): UseChecklistItemsResult {
  const [items, setItems] = useState<ChecklistItemRow[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const timeout = window.setTimeout(() => {
        setItems(readLocalItems(tripSlug))
      }, 0)
      return () => window.clearTimeout(timeout)
    }

    let cancelled = false
    const sb = supabase

    const channel = sb
      .channel(`checklist_items:${tripSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
          filter: `trip_slug=eq.${tripSlug}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<ChecklistItemRow>
            setItems((prev) => prev.filter((i) => i.id !== old.id))
            return
          }
          const row = payload.new as ChecklistItemRow
          setItems((prev) => {
            const idx = prev.findIndex((i) => i.id === row.id)
            if (idx === -1) return [...prev, row]
            const next = prev.slice()
            next[idx] = row
            return next
          })
        },
      )
      .subscribe()

    sb.from('checklist_items')
      .select('*')
      .eq('trip_slug', tripSlug)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error) return
        setItems((data ?? []) as ChecklistItemRow[])
      })

    return () => {
      cancelled = true
      sb.removeChannel(channel)
    }
  }, [tripSlug])

  const addItem = useCallback(
    async (input: AddItemInput): Promise<ChecklistItemRow | null> => {
      if (!isSupabaseConfigured || !supabase) {
        const row = createLocalItem(tripSlug, actorId, input)
        setItems((prev) => {
          const next = [...prev, row]
          writeLocalItems(tripSlug, next)
          return next
        })
        return row
      }
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          trip_slug: tripSlug,
          title: input.title.trim(),
          category: input.category.trim() || 'Other',
          notes: input.notes?.trim() || null,
          created_by_actor_id: actorId,
        })
        .select()
        .single()
      if (error) return null
      return data as ChecklistItemRow
    },
    [tripSlug, actorId],
  )

  const updateItem = useCallback(
    async (id: string, patch: Partial<AddItemInput>): Promise<void> => {
      const update: Record<string, string | null> = {}
      if (patch.title !== undefined) update.title = patch.title.trim()
      if (patch.category !== undefined) update.category = patch.category.trim() || 'Other'
      if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null
      if (Object.keys(update).length === 0) return
      if (!isSupabaseConfigured || !supabase) {
        setItems((prev) => {
          const next = prev.map((item) => (item.id === id ? { ...item, ...update } : item))
          writeLocalItems(tripSlug, next)
          return next
        })
        return
      }
      await supabase.from('checklist_items').update(update).eq('id', id)
    },
    [tripSlug],
  )

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id)
        writeLocalItems(tripSlug, next)
        return next
      })
      return
    }
    await supabase.from('checklist_items').delete().eq('id', id)
  }, [tripSlug])

  return { items, syncEnabled: isSupabaseConfigured, addItem, updateItem, deleteItem }
}
