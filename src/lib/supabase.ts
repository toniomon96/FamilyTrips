import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      realtime: { params: { eventsPerSecond: 10 } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. ' +
      'Checklist toggles will be session-only. See .env.example.',
  )
}

export type ChecklistStateRow = {
  trip_slug: string
  item_id: string
  done: boolean
  updated_at: string
  user_id: string | null
}
