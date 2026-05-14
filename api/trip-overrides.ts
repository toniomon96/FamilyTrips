import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import {
  enforceRateLimit,
  readJsonBody,
  RequestGuardError,
} from './_requestGuards.js'
import {
  runTripOverrideAction,
  type TripOverrideStore,
} from '../src/server/tripOverrideActions.js'
import { TRIP_OVERRIDE_SELECT, type TripOverrideHistoryRow, type TripOverrideRow } from '../src/utils/tripOverrides.js'

type JsonRequest = IncomingMessage & {
  body?: unknown
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function pinMatches(submitted: string, expected: string): boolean {
  const submittedBuffer = Buffer.from(submitted)
  const expectedBuffer = Buffer.from(expected)
  if (submittedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(submittedBuffer, expectedBuffer)
}

function createStore(url: string, serviceRoleKey: string): TripOverrideStore {
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async getCurrent(tripSlug) {
      const { data, error } = await admin
        .from('trip_overrides')
        .select(TRIP_OVERRIDE_SELECT)
        .eq('trip_slug', tripSlug)
        .maybeSingle()
      if (error) throw error
      return (data as TripOverrideRow | null) ?? null
    },
    async upsertCurrent(row) {
      const { error } = await admin.from('trip_overrides').upsert(row, {
        onConflict: 'trip_slug',
      })
      if (error) throw error
    },
    async insertHistory(row) {
      const historyRow = {
        trip_slug: row.trip_slug,
        data: row.data,
        version: row.version,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
        restored_from_version: row.restored_from_version,
      }
      const { error } = await admin.from('trip_override_history').insert(historyRow)
      if (error) throw error
    },
    async getHistory(tripSlug) {
      const { data, error } = await admin
        .from('trip_override_history')
        .select('id,trip_slug,data,version,updated_at,updated_by,restored_from_version')
        .eq('trip_slug', tripSlug)
        .order('version', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as TripOverrideHistoryRow[]
    },
    async getHistoryVersion(tripSlug, version) {
      const { data, error } = await admin
        .from('trip_override_history')
        .select('id,trip_slug,data,version,updated_at,updated_by,restored_from_version')
        .eq('trip_slug', tripSlug)
        .eq('version', version)
        .maybeSingle()
      if (error) throw error
      return (data as TripOverrideHistoryRow | null) ?? null
    },
  }
}

export default async function handler(req: JsonRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed.' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    json(res, 500, { ok: false, error: 'Supabase owner editing is not configured.' })
    return
  }

  try {
    enforceRateLimit(req, 'trip-overrides')
    const body = await readJsonBody(req)
    const result = await runTripOverrideAction(body, createStore(supabaseUrl, serviceRoleKey), {
      adminPin: process.env.ADMIN_PIN,
      editorPin: process.env.TRIP_EDITOR_PIN,
      pinMatches,
    })
    json(res, result.status, result.body)
  } catch (error) {
    if (error instanceof RequestGuardError) {
      json(res, error.status, { ok: false, error: error.publicMessage })
      return
    }
    json(res, 500, { ok: false, error: 'Owner edit request failed.' })
  }
}
