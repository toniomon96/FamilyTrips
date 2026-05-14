import { describe, expect, it } from 'vitest'
import type { TripOverrideHistoryRow, TripOverrideRow } from '../utils/tripOverrides'
import { editableFieldsFromTrip } from '../utils/tripOverrides'
import { okc } from '../data/trips/okc'
import { familyCookout } from '../data/trips/family-cookout'
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
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'Codex UAT',
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
    expect(state.current?.created_by).toBe('Codex UAT')
    expect(state.current?.created_at).toBe(dynamicCurrent.created_at)
  })

  it('previews Smart Assist for dynamic trips without writing', async () => {
    const dynamicCurrent: TripOverrideRow = {
      trip_slug: 'logan-morgan-honeymoon',
      data: {
        ...editableFieldsFromTrip(okc),
        name: 'Logan + Morgan Honeymoon',
        location: 'Los Cabos, Mexico',
        visibility: 'unlisted',
        thingsToDo: [{ id: 'td-golf', name: 'Golf', category: 'Activity' }],
      },
      version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'creator',
      source: 'dynamic',
      visibility: 'unlisted',
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'Logan',
    }
    const state = createStore([], dynamicCurrent)
    const result = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'logan-morgan-honeymoon',
        pin: 'editor',
        assistAction: 'booking-reminders',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(200)
    expect(state.current?.version).toBe(1)
    expect(state.history).toHaveLength(0)
    if (!result.body.ok || !('assist' in result.body)) return
    expect(result.body.assist.summary.some((item) => item.includes('Golf'))).toBe(true)
    expect(result.body.assist.mergedTrip.bookings.some((booking) => booking.title === 'Golf')).toBe(true)
    expect(result.body.assist.sections.some((section) => section.id === 'bookings')).toBe(true)
    expect(result.body.assist.sections.every((section) => section.fields.length > 0)).toBe(true)
  })

  it('uses saved planner recommendations and mini-plans for location-aware Smart Assist', async () => {
    const dynamicCurrent: TripOverrideRow = {
      trip_slug: 'logan-morgan-honeymoon',
      data: {
        ...editableFieldsFromTrip(okc),
        name: 'Logan + Morgan Honeymoon',
        location: 'Los Cabos, Mexico',
        visibility: 'unlisted',
        planner: {
          draftStrength: 'strong',
          warnings: [],
          missingInputs: [],
          generatedAt: '2026-01-01T00:00:00.000Z',
          sourceMode: 'curated',
          sourceRefs: [{ id: 'src-user-brief', title: 'User brief', kind: 'user-provided' }],
          recommendations: [
            {
              id: 'rec-lumiere',
              name: 'Lumiere',
              category: 'restaurant',
              sourceIds: ['src-user-brief'],
              bestFor: ['dinner'],
              whyItFits: 'Romantic dinner option from saved destination context.',
              bookingStatus: 'needs-confirmation',
              nextStep: 'Ask concierge about availability and dress code.',
              confidence: 'high',
            },
          ],
          miniPlans: [
            {
              id: 'mp-golf',
              title: 'Play a round of golf',
              type: 'activity',
              status: 'needs-booking',
              recommendedDate: okc.startDate,
              recommendedTimeWindow: 'Morning',
              logisticsNote: 'Confirm tee time, transportation, club rental, and dress code.',
              packingImplication: 'Golf outfit and sunscreen.',
              sourceIds: ['src-user-brief'],
            },
          ],
        },
      },
      version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'creator',
      source: 'dynamic',
      visibility: 'unlisted',
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'Logan',
    }
    const state = createStore([], dynamicCurrent)
    const restaurants = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'logan-morgan-honeymoon',
        pin: 'editor',
        assistAction: 'improve-restaurants',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )
    const miniPlans = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'logan-morgan-honeymoon',
        pin: 'editor',
        assistAction: 'must-do-mini-plans',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(restaurants.status).toBe(200)
    expect(miniPlans.status).toBe(200)
    expect(state.current?.version).toBe(1)
    if (restaurants.body.ok && 'assist' in restaurants.body) {
      expect(restaurants.body.assist.mergedTrip.thingsToDo.some((item) => item.name === 'Lumiere')).toBe(true)
      expect(restaurants.body.assist.sections.some((section) => section.id === 'recommendations')).toBe(true)
    }
    if (miniPlans.body.ok && 'assist' in miniPlans.body) {
      expect(miniPlans.body.assist.mergedTrip.bookings.some((booking) => booking.title === 'Play a round of golf')).toBe(true)
      expect(miniPlans.body.assist.mergedTrip.packing?.some((item) => item.title.includes('Play a round of golf'))).toBe(true)
      expect(miniPlans.body.assist.sections.map((section) => section.id)).toEqual(
        expect.arrayContaining(['bookings', 'checklist', 'packing']),
      )
    }
  })

  it('previews event-native Smart Assist sections for dynamic events', async () => {
    const dynamicCurrent: TripOverrideRow = {
      trip_slug: 'codex-family-cookout',
      data: {
        ...editableFieldsFromTrip(familyCookout),
        name: 'Codex Family Cookout',
        visibility: 'unlisted',
        itinerary: [{ date: familyCookout.startDate, title: 'Cookout day', items: [] }],
        eventTasks: [],
        supplies: [],
      },
      version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'creator',
      source: 'dynamic',
      visibility: 'unlisted',
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'Codex UAT',
    }
    const state = createStore([], dynamicCurrent)
    const runOfShow = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'codex-family-cookout',
        pin: 'editor',
        assistAction: 'event-run-of-show',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )
    const supplies = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'codex-family-cookout',
        pin: 'editor',
        assistAction: 'event-supplies',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(runOfShow.status).toBe(200)
    expect(supplies.status).toBe(200)
    if (runOfShow.body.ok && 'assist' in runOfShow.body) {
      expect(runOfShow.body.assist.mergedTrip.itinerary[0]?.items.some((item) => item.title === 'Host setup window')).toBe(true)
      expect(runOfShow.body.assist.sections.map((section) => section.id)).toEqual(expect.arrayContaining(['itinerary', 'event']))
    }
    if (supplies.body.ok && 'assist' in supplies.body) {
      expect(supplies.body.assist.mergedTrip.supplies?.some((item) => item.title === 'Serving table basics')).toBe(true)
      expect(supplies.body.assist.sections.some((section) => section.id === 'event')).toBe(true)
    }
  })

  it('does not let the shared editor PIN preview Smart Assist for static seed trips', async () => {
    const state = createStore()
    const result = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'okc',
        pin: 'editor',
        assistAction: 'fill-missing',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(401)
  })

  it('lets the admin PIN preview Smart Assist for static seed trips', async () => {
    const state = createStore()
    const result = await runTripOverrideAction(
      {
        action: 'assistPreview',
        tripSlug: 'okc',
        pin: 'admin',
        assistAction: 'packing-checklist',
      },
      state.store,
      { adminPin: 'admin', editorPin: 'editor' },
    )

    expect(result.status).toBe(200)
    expect(state.current).toBeNull()
    if (!result.body.ok || !('assist' in result.body)) return
    expect(result.body.assist.data).toBeTruthy()
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
