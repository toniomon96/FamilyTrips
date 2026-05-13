import { describe, expect, it } from 'vitest'
import { createTripShell } from '../utils/tripShell'
import type { TripOverrideHistoryRow, TripOverrideRow } from '../utils/tripOverrides'
import { runTripCreateAction, type TripCreateStore } from './tripActions'

function createStore(seedRows: TripOverrideRow[] = []): {
  rows: Map<string, TripOverrideRow>
  history: TripOverrideHistoryRow[]
  store: TripCreateStore
} {
  const rows = new Map(seedRows.map((row) => [row.trip_slug, row]))
  const history: TripOverrideHistoryRow[] = []
  return {
    rows,
    history,
    store: {
      async getCurrent(tripSlug) {
        return rows.get(tripSlug) ?? null
      },
      async insertCurrent(row) {
        if (rows.has(row.trip_slug)) return false
        rows.set(row.trip_slug, row)
        return true
      },
      async insertHistory(row) {
        history.unshift({ ...row, id: `hist-${row.version}` })
      },
      async deleteUatTrip(tripSlug) {
        const deleted = rows.delete(tripSlug)
        for (let index = history.length - 1; index >= 0; index -= 1) {
          if (history[index].trip_slug === tripSlug) {
            history.splice(index, 1)
          }
        }
        return deleted
      },
    },
  }
}

describe('trip create API action handler', () => {
  it('rejects an incorrect shared edit PIN', async () => {
    const state = createStore()
    const trip = createTripShell({
      name: 'Lake Weekend',
      location: 'Lake House',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      template: 'general',
    })

    const result = await runTripCreateAction(
      { action: 'create', pin: 'wrong', trip },
      state.store,
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(401)
    expect(state.rows.size).toBe(0)
  })

  it('rejects generation with an incorrect shared edit PIN', async () => {
    const state = createStore()

    const result = await runTripCreateAction(
      {
        action: 'generate',
        pin: 'wrong',
        brief: {
          name: 'Logan Morgan Honeymoon',
          destination: 'Le Blanc Spa Resort Los Cabos',
          startDate: '2026-07-19',
          endDate: '2026-07-23',
        },
      },
      state.store,
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(401)
    expect(state.rows.size).toBe(0)
  })

  it('creates a dynamic unlisted trip with the shared edit PIN', async () => {
    const state = createStore()
    const trip = createTripShell({
      name: 'Logan Morgan Honeymoon',
      location: 'Le Blanc Spa Resort Los Cabos',
      startDate: '2026-07-19',
      endDate: '2026-07-23',
      template: 'honeymoon',
      travelers: 'Logan, Morgan',
    })

    const result = await runTripCreateAction(
      { action: 'create', pin: 'editor', trip, createdBy: 'Logan' },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(200)
    expect(state.rows.get('logan-morgan-honeymoon')?.source).toBe('dynamic')
    expect(state.rows.get('logan-morgan-honeymoon')?.visibility).toBe('unlisted')
    expect(state.history).toHaveLength(1)
  })

  it('generates a dynamic unlisted smart draft with the shared edit PIN', async () => {
    const state = createStore()

    const result = await runTripCreateAction(
      {
        action: 'generate',
        pin: 'editor',
        createdBy: 'Logan',
        brief: {
          name: 'Logan Morgan Honeymoon',
          destination: 'Le Blanc Spa Resort Los Cabos',
          startDate: '2026-07-19',
          endDate: '2026-07-23',
          travelers: 'Logan, Morgan',
          vibe: ['honeymoon', 'relaxed', 'romantic', 'resort-heavy'],
          mustDos: ['Play a round of golf', 'Ride horses on the beach', 'Go to Lovers Beach'],
        },
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(200)
    expect(state.rows.get('logan-morgan-honeymoon')?.source).toBe('dynamic')
    expect(state.rows.get('logan-morgan-honeymoon')?.visibility).toBe('unlisted')
    if (!result.body.ok) return
    expect('trip' in result.body).toBe(true)
    if (!('trip' in result.body)) return
    expect(result.body.generationSummary?.matchedPackId).toBe('le-blanc-los-cabos')
    expect(result.body.trip.itinerary).toHaveLength(5)
    expect(JSON.stringify(result.body.trip).toLowerCase()).toContain('lovers beach')
  })

  it('falls back to deterministic generation when AI output is invalid', async () => {
    const state = createStore()

    const result = await runTripCreateAction(
      {
        action: 'generate',
        pin: 'editor',
        brief: {
          name: 'AI Fallback Honeymoon',
          destination: 'Le Blanc Los Cabos',
          startDate: '2026-07-19',
          endDate: '2026-07-23',
          mustDos: ['Golf'],
        },
      },
      state.store,
      {
        editorPin: 'editor',
        aiPlanner: async (input, context) => ({
          ...context.fallbackTrip,
          slug: input.slug,
          itinerary: [],
        }),
      },
    )

    expect(result.status).toBe(200)
    if (!result.body.ok) return
    expect('trip' in result.body).toBe(true)
    if (!('trip' in result.body)) return
    expect(result.body.generationSummary?.source).toBe('ai-fallback')
    expect(result.body.trip.name).toBe('AI Fallback Honeymoon')
  })

  it('rejects duplicate static and dynamic slugs', async () => {
    const state = createStore()
    const staticTrip = createTripShell({
      name: 'OKC',
      location: 'Oklahoma City',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      template: 'general',
    })
    const dynamicTrip = createTripShell({
      name: 'Lake Weekend',
      location: 'Lake House',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      template: 'general',
    })

    const first = await runTripCreateAction(
      { action: 'create', pin: 'editor', trip: dynamicTrip },
      state.store,
      { editorPin: 'editor' },
    )
    const duplicateStatic = await runTripCreateAction(
      { action: 'create', pin: 'editor', trip: staticTrip },
      state.store,
      { editorPin: 'editor' },
    )
    const duplicateDynamic = await runTripCreateAction(
      { action: 'create', pin: 'editor', trip: dynamicTrip },
      state.store,
      { editorPin: 'editor' },
    )

    expect(first.status).toBe(200)
    expect(duplicateStatic.status).toBe(409)
    expect(duplicateDynamic.status).toBe(409)
  })

  it('rejects duplicate generated slugs', async () => {
    const state = createStore()
    const brief = {
      name: 'Duplicate Honeymoon',
      destination: 'Le Blanc Los Cabos',
      startDate: '2026-07-19',
      endDate: '2026-07-23',
    }

    const first = await runTripCreateAction(
      { action: 'generate', pin: 'editor', brief },
      state.store,
      { editorPin: 'editor' },
    )
    const duplicate = await runTripCreateAction(
      { action: 'generate', pin: 'editor', brief },
      state.store,
      { editorPin: 'editor' },
    )

    expect(first.status).toBe(200)
    expect(duplicate.status).toBe(409)
  })

  it('returns conflict if the database rejects a same-slug create race', async () => {
    const state = createStore()
    const trip = createTripShell({
      name: 'Race Trip',
      location: 'Somewhere',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      template: 'general',
    })
    const raceStore: TripCreateStore = {
      ...state.store,
      async getCurrent() {
        return null
      },
      async insertCurrent() {
        return false
      },
    }

    const result = await runTripCreateAction(
      { action: 'create', pin: 'editor', trip },
      raceStore,
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(409)
    expect(state.history).toHaveLength(0)
  })

  it('rejects invalid trip dates before writing', async () => {
    const state = createStore()
    const trip = createTripShell({
      name: 'Bad Dates',
      location: 'Somewhere',
      startDate: '2026-07-23',
      endDate: '2026-07-19',
      template: 'general',
    })

    const result = await runTripCreateAction(
      { action: 'create', pin: 'editor', trip },
      state.store,
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(400)
    expect(state.rows.size).toBe(0)
  })

  it('rejects invalid generation dates before writing', async () => {
    const state = createStore()

    const result = await runTripCreateAction(
      {
        action: 'generate',
        pin: 'editor',
        brief: {
          name: 'Bad Generated Dates',
          destination: 'Le Blanc Los Cabos',
          startDate: '2026-07-23',
          endDate: '2026-07-19',
        },
      },
      state.store,
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(400)
    expect(state.rows.size).toBe(0)
  })

  it('deletes only Codex UAT dynamic test trips', async () => {
    const state = createStore()

    const created = await runTripCreateAction(
      {
        action: 'generate',
        pin: 'editor',
        createdBy: 'Codex UAT',
        brief: {
          slug: 'codex-uat-le-blanc-123',
          name: 'Codex UAT Le Blanc',
          destination: 'Le Blanc Los Cabos',
          startDate: '2026-07-19',
          endDate: '2026-07-23',
        },
      },
      state.store,
      { editorPin: 'editor' },
    )
    const deleted = await runTripCreateAction(
      { action: 'deleteUat', pin: 'editor', tripSlug: 'codex-uat-le-blanc-123' },
      state.store,
      { editorPin: 'editor' },
    )

    expect(created.status).toBe(200)
    expect(deleted.status).toBe(200)
    expect(state.rows.has('codex-uat-le-blanc-123')).toBe(false)
    expect(state.history).toHaveLength(0)
  })

  it('does not let the UAT cleanup action delete real dynamic trips', async () => {
    const realTrip = createTripShell({
      name: 'Real Honeymoon',
      location: 'Le Blanc Los Cabos',
      startDate: '2026-07-19',
      endDate: '2026-07-23',
      template: 'honeymoon',
    })
    const createdAt = new Date().toISOString()
    const state = createStore([
      {
        trip_slug: realTrip.slug,
        data: realTrip,
        version: 1,
        updated_at: createdAt,
        updated_by: 'Logan',
        source: 'dynamic',
        visibility: 'unlisted',
        created_at: createdAt,
        created_by: 'Logan',
      },
    ])

    const result = await runTripCreateAction(
      { action: 'deleteUat', pin: 'editor', tripSlug: realTrip.slug },
      state.store,
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(403)
    expect(state.rows.has(realTrip.slug)).toBe(true)
  })

  it('returns conflict if a UAT row disappears before cleanup completes', async () => {
    const createdAt = new Date().toISOString()
    const state = createStore([
      {
        trip_slug: 'codex-uat-vanishing',
        data: createTripShell({
          slug: 'codex-uat-vanishing',
          name: 'Vanishing UAT',
          location: 'Le Blanc Los Cabos',
          startDate: '2026-07-19',
          endDate: '2026-07-23',
          template: 'honeymoon',
        }),
        version: 1,
        updated_at: createdAt,
        updated_by: 'Codex UAT',
        source: 'dynamic',
        visibility: 'unlisted',
        created_at: createdAt,
        created_by: 'Codex UAT',
      },
    ])

    const result = await runTripCreateAction(
      { action: 'deleteUat', pin: 'editor', tripSlug: 'codex-uat-vanishing' },
      {
        ...state.store,
        async deleteUatTrip() {
          return false
        },
      },
      { editorPin: 'editor' },
    )

    expect(result.status).toBe(409)
  })
})
