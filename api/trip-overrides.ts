import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import {
  runTripOverrideAction,
  type TripOverrideStore,
} from '../src/server/tripOverrideActions.js'
import type { TripOverrideHistoryRow, TripOverrideRow } from '../src/utils/tripOverrides.js'

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

async function readBody(req: JsonRequest): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body !== 'string') return req.body
    return req.body.trim() ? JSON.parse(req.body) : {}
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw.trim() ? JSON.parse(raw) : {}
}

function createStore(url: string, serviceRoleKey: string): TripOverrideStore {
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async getCurrent(tripSlug) {
      const { data, error } = await admin
        .from('trip_overrides')
        .select('trip_slug,data,version,updated_at,updated_by')
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
      const { error } = await admin.from('trip_override_history').insert(row)
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
    const body = await readBody(req)
    const result = await runTripOverrideAction(body, createStore(supabaseUrl, serviceRoleKey), {
      adminPin: process.env.ADMIN_PIN,
      pinMatches,
    })
    json(res, result.status, result.body)
  } catch {
    json(res, 500, { ok: false, error: 'Owner edit request failed.' })
  }
}
