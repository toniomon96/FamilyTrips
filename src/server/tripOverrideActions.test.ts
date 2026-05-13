import { describe, expect, it } from 'vitest'
import type { TripOverrideHistoryRow, TripOverrideRow } from '../utils/tripOverrides'
import { editableFieldsFromTrip } from '../utils/tripOverrides'
import { okc } from '../data/trips/okc'
import { runTripOverrideAction, type TripOverrideStore } from './tripOverrideActions'

function createStore(seedHistory: TripOverrideHistoryRow[] = [], seedCurrent: TripOverrideRow | null = null): {
  store: TripOverrideStore
  current: TripOverrideRow | null
  history: TripOverrideHistoryRow[]
} {
  const state: {
    current: TripOverrideRow | null
    history: TripOverrideHistoryRow[]
  } = {
    current: seedCurrent,
    history: seedHistory.slice(),
  }

  return {
    get current() {
      return state.current
    },
    get history() {
      return state.history
    },
    store: {
      async getCurrent(tripSlug) {
        return state.current?.trip_slug === tripSlug ? state.current : null
      },
      async upsertCurrent(row) {
        state.current = row
      },
      async insertHistory(row) {
        state.history.unshift({ ...row, id: `hist-${row.version}` })
      },
      async getHistory(tripSlug) {
        return state.history.filter((row) => row.trip_slug === tripSlug)
      },
      async getHistoryVersion(tripSlug, version) {
        return (
          state.history.find((row) => row.trip_slug === tripSlug && row.version === version) ?? null
        )
      },
    },
  }
}

describe('trip override API action handler', () => {
  it('rejects missing and incorrect owner pins', async () => {
    const { store } = createStore()

    const missing = await runTripOverrideAction({}, store, { adminPin: '1234' })
    const wrong = await runTripOverrideAction(
      { action: 'history', tripSlug: 'okc', pin: '0000' },
      store,
      { adminPin: '1234' },
    )

    expect(missing.status).toBe(400)
    expect(wrong.status).toBe(401)
  })

  it('saves a valid override and appends history', async () => {
    const state = createStore()
    const editable = editableFieldsFromTrip(okc)
    const result = await runTripOverrideAction(
      {
        action: 'save',
        tripSlug: 'okc',
        pin: '1234',
        data: { ...editable, name: 'OKC Owner Edit' },
      },
      state.store,
      { adminPin: '1234' },
    )

    expect(result.status).toBe(200)
    expect(state.current?.version).toBe(1)
    expect(state.current?.data.name).toBe('OKC Owner Edit')
    expect(state.history).toHaveLength(1)
  })

  it('does not let the shared editor PIN edit static seed trips', async () => {
    const state = createStore()
    const result = await runTripOverrideAction(
      {
        action: 'save',
        tripSlug: 'okc',
        pin: 'editor',
        data: { ...editableFieldsFromTrip(okc), name: 'Shared PIN edit' },
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(401)
    expect(state.current).toBeNull()
  })

  it('lets the shared editor PIN edit dynamic trips', async () => {
    const dynamicCurrent: TripOverrideRow = {
      trip_slug: 'logan-morgan-honeymoon',
      data: {
        ...editableFieldsFromTrip(okc),
        name: 'Logan + Morgan Honeymoon',
        location: 'Los Cabos, Mexico',
        visibility: 'unlisted',
      },
      version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'creator',
      source: 'dynamic',
      visibility: 'unlisted',
    }
    const state = createStore([], dynamicCurrent)
    const result = await runTripOverrideAction(
      {
        action: 'save',
        tripSlug: 'logan-morgan-honeymoon',
        pin: 'editor',
        data: { ...dynamicCurrent.data, name: 'Updated Honeymoon' },
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(200)
    expect(state.current?.version).toBe(2)
    expect(state.current?.data.name).toBe('Updated Honeymoon')
    expect(state.current?.source).toBe('dynamic')
  })

  it('rejects invalid saved payloads before writing', async () => {
    const state = createStore()
    const result = await runTripOverrideAction(
      {
        action: 'save',
        tripSlug: 'okc',
        pin: '1234',
        data: { ...editableFieldsFromTrip(okc), endDate: 'not-a-date' },
      },
      state.store,
      { adminPin: '1234' },
    )

    expect(result.status).toBe(400)
    expect(state.current).toBeNull()
    expect(result.body.ok).toBe(false)
    if (!result.body.ok) expect(result.body.validationErrors?.length).toBeGreaterThan(0)
  })

  it('restores a history version as a new live version', async () => {
    const historyRow: TripOverrideHistoryRow = {
      id: 'hist-1',
      trip_slug: 'okc',
      version: 1,
      data: { ...editableFieldsFromTrip(okc), name: 'Restored OKC' },
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'owner',
      restored_from_version: null,
    }
    const state = createStore([historyRow])

    const result = await runTripOverrideAction(
      { action: 'restore', tripSlug: 'okc', pin: '1234', version: 1 },
      state.store,
      { adminPin: '1234' },
    )

    expect(result.status).toBe(200)
    expect(state.current?.version).toBe(1)
    expect(state.current?.data.name).toBe('Restored OKC')
    expect(state.history[0].restored_from_version).toBe(1)
  })
})
