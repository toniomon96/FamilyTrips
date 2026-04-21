import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase, type ChecklistItemRow } from '../lib/supabase'

export type AddItemInput = {
  title: string
  category: string
  notes?: string | null
}

type UseChecklistItemsResult = {
  items: ChecklistItemRow[]
  addItem: (input: AddItemInput) => Promise<ChecklistItemRow | null>
  updateItem: (id: string, patch: Partial<AddItemInput>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

export function useChecklistItems(
  tripSlug: string,
  actorId: string | null,
): UseChecklistItemsResult {
  const [items, setItems] = useState<ChecklistItemRow[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

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
      if (!isSupabaseConfigured || !supabase) return null
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
      if (!isSupabaseConfigured || !supabase) return
      const update: Record<string, string | null> = {}
      if (patch.title !== undefined) update.title = patch.title.trim()
      if (patch.category !== undefined) update.category = patch.category.trim() || 'Other'
      if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null
      if (Object.keys(update).length === 0) return
      await supabase.from('checklist_items').update(update).eq('id', id)
    },
    [],
  )

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) return
    await supabase.from('checklist_items').delete().eq('id', id)
  }, [])

  return { items, addItem, updateItem, deleteItem }
}
