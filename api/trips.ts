import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import {
  enforceRateLimit,
  readJsonBody,
  RequestGuardError,
} from './_requestGuards.js'
import { runTripCreateAction, type TripCreateStore } from '../src/server/tripActions.js'
import type { PlannerSourceRef, Trip } from '../src/types/trip.js'
import { TRIP_OVERRIDE_SELECT, type TripOverrideHistoryRow, type TripOverrideRow } from '../src/utils/tripOverrides.js'
import type {
  NormalizedTripGenerationBrief,
  ResearchBundle,
  TripAiPlanner,
  TripGenerationContext,
  TripResearcher,
  BriefQuality,
} from '../src/utils/tripGeneration.js'

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

function createStore(url: string, serviceRoleKey: string): TripCreateStore {
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
    async insertCurrent(row) {
      const { error } = await admin.from('trip_overrides').insert(row)
      if (error?.code === '23505') return false
      if (error) throw error
      return true
    },
    async insertHistory(row) {
      const historyRow: Omit<TripOverrideHistoryRow, 'id' | 'source' | 'visibility' | 'created_at' | 'created_by'> = {
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
    async deleteUatTrip(tripSlug) {
      const { data: current, error: currentError } = await admin
        .from('trip_overrides')
        .select('trip_slug')
        .eq('trip_slug', tripSlug)
        .eq('source', 'dynamic')
        .eq('created_by', 'Codex UAT')
        .maybeSingle()
      if (currentError) throw currentError
      if (!current) return false

      const { error: historyError } = await admin.from('trip_override_history').delete().eq('trip_slug', tripSlug)
      if (historyError) throw historyError

      const { error: stateError } = await admin.from('checklist_state').delete().eq('trip_slug', tripSlug)
      if (stateError) throw stateError

      const { error: itemsError } = await admin.from('checklist_items').delete().eq('trip_slug', tripSlug)
      if (itemsError) throw itemsError

      const { data: deleted, error: deleteError } = await admin
        .from('trip_overrides')
        .delete()
        .eq('trip_slug', tripSlug)
        .eq('source', 'dynamic')
        .eq('created_by', 'Codex UAT')
        .select('trip_slug')
        .maybeSingle()
      if (deleteError) throw deleteError
      if (!deleted) return false

      return true
    },
  }
}

function nullableString() {
  return { type: ['string', 'null'] }
}

function stringArray() {
  return { type: 'array', items: { type: 'string' } }
}

function objectArray(itemSchema: Record<string, unknown>) {
  return { type: 'array', items: itemSchema }
}

function tripResponseSchema(): Record<string, unknown> {
  const itineraryItem = {
    type: 'object',
    additionalProperties: false,
    required: ['time', 'title', 'notes', 'address', 'link'],
    properties: {
      time: nullableString(),
      title: { type: 'string' },
      notes: nullableString(),
      address: nullableString(),
      link: nullableString(),
    },
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['trip'],
    properties: {
      trip: {
        type: 'object',
        additionalProperties: false,
        required: [
          'slug',
          'name',
          'location',
          'startDate',
          'endDate',
          'visibility',
          'currency',
          'tagline',
          'stay',
          'bookings',
          'itinerary',
          'thingsToDo',
          'people',
          'contacts',
          'checklist',
          'packing',
          'copyBlocks',
          'budget',
        ],
        properties: {
          slug: { type: 'string' },
          name: { type: 'string' },
          location: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          visibility: { enum: ['listed', 'unlisted'] },
          currency: { type: 'string' },
          tagline: nullableString(),
          stay: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'address', 'checkIn', 'checkOut', 'amenities', 'notes'],
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              checkIn: { type: 'string' },
              checkOut: { type: 'string' },
              amenities: stringArray(),
              notes: nullableString(),
            },
          },
          bookings: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'kind', 'title', 'details', 'link', 'confirmation', 'when'],
            properties: {
              id: { type: 'string' },
              kind: { enum: ['flight', 'stay', 'car', 'activity', 'other'] },
              title: { type: 'string' },
              details: nullableString(),
              link: nullableString(),
              confirmation: nullableString(),
              when: nullableString(),
            },
          }),
          itinerary: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['date', 'title', 'items'],
            properties: {
              date: { type: 'string' },
              title: nullableString(),
              items: objectArray(itineraryItem),
            },
          }),
          thingsToDo: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'category', 'address', 'url', 'notes'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: nullableString(),
              address: nullableString(),
              url: nullableString(),
              notes: nullableString(),
            },
          }),
          people: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'role', 'phone', 'arriving', 'leaving'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              role: nullableString(),
              phone: nullableString(),
              arriving: nullableString(),
              leaving: nullableString(),
            },
          }),
          contacts: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'label', 'value', 'kind', 'notes'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              value: { type: 'string' },
              kind: { enum: ['phone', 'url', 'text'] },
              notes: nullableString(),
            },
          }),
          checklist: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'title', 'category', 'done', 'notes'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              category: { type: 'string' },
              done: { type: 'boolean' },
              notes: nullableString(),
            },
          }),
          packing: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'title', 'category', 'packed', 'quantity', 'notes', 'assignedTo'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              category: { type: 'string' },
              packed: { type: ['boolean', 'null'] },
              quantity: nullableString(),
              notes: nullableString(),
              assignedTo: nullableString(),
            },
          }),
          copyBlocks: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'title', 'body'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              body: { type: 'string' },
            },
          }),
          budget: objectArray({
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'total', 'splitCount', 'status', 'notes'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              total: { type: 'number' },
              splitCount: { type: 'number' },
              status: { enum: ['confirmed', 'estimate', 'tbd'] },
              notes: nullableString(),
            },
          }),
        },
      },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extractResponseText(value: unknown): string | null {
  if (!isRecord(value)) return null
  if (typeof value.output_text === 'string') return value.output_text
  const output = value.output
  if (!Array.isArray(output)) return null
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue
    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === 'string') return content.text
    }
  }
  return null
}

function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls)
  if (!isRecord(value)) return value
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (child !== null) next[key] = stripNulls(child)
  }
  return next
}

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function parseAiTrip(value: unknown): Trip | null {
  const text = extractResponseText(value)
  if (!text) return null
  const parsed = JSON.parse(text) as unknown
  if (!isRecord(parsed) || !isRecord(parsed.trip)) return null
  return stripNulls(parsed.trip) as Trip
}

function collectSourceRefs(value: unknown, refs: PlannerSourceRef[] = [], depth = 0): PlannerSourceRef[] {
  if (depth > 8) return refs
  if (Array.isArray(value)) {
    for (const item of value) collectSourceRefs(item, refs, depth + 1)
    return refs
  }
  if (!isRecord(value)) return refs

  const url = safeHttpUrl(value.url)
  if (url) {
    const duplicate = refs.some((ref) => ref.url === url)
    if (!duplicate) {
      refs.push({
        id: `src-search-${refs.length + 1}`,
        title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : url,
        url,
        kind: 'search',
        note: typeof value.note === 'string' ? value.note : undefined,
      })
    }
  }

  for (const child of Object.values(value)) collectSourceRefs(child, refs, depth + 1)
  return refs
}

function parseResearchBundle(value: unknown): ResearchBundle | null {
  const sourceRefs = collectSourceRefs(value).slice(0, 12)
  const text = extractResponseText(value) ?? ''
  const insights = text
    .split(/\r?\n/g)
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 12)

  if (sourceRefs.length === 0 && insights.length === 0) return null

  return {
    sourceRefs,
    insights,
    notes: sourceRefs.length > 0
      ? ['Live web search returned source references for review.']
      : ['OpenAI returned research text without durable source URLs.'],
    usedSearch: sourceRefs.length > 0,
  }
}

function createOpenAiResearcher(apiKey: string | undefined, model: string | undefined): TripResearcher | undefined {
  const researchEnabled = (process.env.TRIP_RESEARCH_ENABLED ?? '1').toLowerCase()
  if (!apiKey || researchEnabled === '0' || researchEnabled === 'false') return undefined
  return async (input: NormalizedTripGenerationBrief, quality: BriefQuality) => {
    const maxQueries = Number(process.env.TRIP_RESEARCH_MAX_QUERIES || 4)
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || process.env.TRIP_GENERATION_MODEL || 'gpt-5.5',
        tools: [{ type: 'web_search', search_context_size: 'low' }],
        tool_choice: 'auto',
        include: ['web_search_call.action.sources'],
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'Research a family travel or event planning brief. Prefer official venue, resort, restaurant, attraction, and event sources. ' +
                  'Return only structured JSON. Do not invent availability, exact prices, confirmation numbers, or private contact details.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({
                  brief: input,
                  quality,
                  maxQueries: Number.isFinite(maxQueries) ? Math.max(1, Math.min(8, maxQueries)) : 4,
                  instructions:
                    'Find source-backed planning facts and cite URLs/titles when possible. Focus on official sources and practical planning constraints.',
                }),
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      return {
        sourceRefs: [],
        insights: [],
        notes: [`Live web research request failed with status ${response.status}.`],
        usedSearch: false,
      }
    }
    return parseResearchBundle(await response.json()) ?? {
      sourceRefs: [],
      insights: [],
      notes: ['Live web research response did not include durable source URLs.'],
      usedSearch: false,
    }
  }
}

function createOpenAiPlanner(apiKey: string | undefined, model: string | undefined): TripAiPlanner | undefined {
  if (!apiKey) return undefined
  return async (input: NormalizedTripGenerationBrief, context: TripGenerationContext) => {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-5.5',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'You generate editable FamilyTrips plans. Return only structured JSON matching the schema. ' +
                  'Use the fallback trip as the safe base. Improve the plan only with user-provided details and destination-pack facts. ' +
                  'Do not invent confirmation numbers, private phone numbers, exact prices, guaranteed availability, or unsupported claims. ' +
                  'Mark uncertain dining, activity, and transportation details in notes as needing confirmation.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({
                  brief: input,
                  destinationPack: context.destinationPack,
                  research: context.research,
                  fallbackTrip: context.fallbackTrip,
                  fallbackSummary: context.fallbackSummary,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'familytrips_generated_trip',
            strict: true,
            schema: tripResponseSchema(),
          },
        },
      }),
    })

    if (!response.ok) return null
    return parseAiTrip(await response.json())
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
    json(res, 500, { ok: false, error: 'Supabase trip creation is not configured.' })
    return
  }

  try {
    enforceRateLimit(req, 'trips')
    const body = await readJsonBody(req)
    const result = await runTripCreateAction(body, createStore(supabaseUrl, serviceRoleKey), {
      adminPin: process.env.ADMIN_PIN,
      editorPin: process.env.TRIP_EDITOR_PIN,
      aiPlanner: createOpenAiPlanner(process.env.OPENAI_API_KEY, process.env.TRIP_GENERATION_MODEL),
      researcher: createOpenAiResearcher(process.env.OPENAI_API_KEY, process.env.TRIP_RESEARCH_MODEL),
      pinMatches,
    })
    json(res, result.status, result.body)
  } catch (error) {
    if (error instanceof RequestGuardError) {
      json(res, error.status, { ok: false, error: error.publicMessage })
      return
    }
    json(res, 500, { ok: false, error: 'Trip create request failed.' })
  }
}
