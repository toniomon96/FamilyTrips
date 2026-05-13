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
      async upsertCurrent(row) {
        rows.set(row.trip_slug, row)
      },
      async insertHistory(row) {
        history.unshift({ ...row, id: `hist-${row.version}` })
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
})
