import { describe, expect, it } from 'vitest'
import type { Trip } from '../types/trip'
import { findDestinationPack } from './destinationPacks'
import {
  buildDeterministicTrip,
  generateSmartTrip,
  normalizeTripGenerationBrief,
  scorePlanBrief,
} from './tripGeneration'
import { validateTripForSave } from './tripShell'

function leBlancBrief() {
  const normalized = normalizeTripGenerationBrief({
    name: 'Logan + Morgan Honeymoon',
    destination: 'Le Blanc Los Cabo',
    startDate: '2026-07-19',
    endDate: '2026-07-23',
    travelers: 'Logan, Morgan',
    brief: 'Keep it loose and romantic with resort downtime.',
    vibe: ['honeymoon', 'relaxed', 'romantic', 'resort-heavy'],
    pace: 'very-loose',
    mustDos: ['Play a round of golf', 'Ride horses on the beach', 'Go to Lovers Beach in Cabo'],
  })

  if (!normalized.ok) throw new Error('Expected Le Blanc brief to normalize.')
  return normalized.brief
}

function allText(trip: Trip): string {
  return JSON.stringify(trip).toLowerCase()
}

describe('smart trip generation', () => {
  it('normalizes brief inputs and creates a clean slug', () => {
    const normalized = normalizeTripGenerationBrief({
      name: 'Logan + Morgan Honeymoon!',
      destination: 'Le Blanc Spa Resort Los Cabos',
      startDate: '2026-07-19',
      endDate: '2026-07-23',
      travelers: 'Logan, Morgan, Logan',
      vibe: ['Honeymoon', 'Relaxed', 'honeymoon'],
      mustDos: ['Golf', { title: 'Lovers Beach', timing: 'last-full-day' }],
    })

    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return
    expect(normalized.brief.slug).toBe('logan-morgan-honeymoon')
    expect(normalized.brief.travelerNames).toEqual(['Logan', 'Morgan'])
    expect(normalized.brief.vibe).toEqual(['honeymoon', 'relaxed'])
    expect(normalized.brief.template).toBe('honeymoon')
    expect(normalized.brief.mustDos).toHaveLength(2)
  })

  it('rejects invalid generation dates', () => {
    const normalized = normalizeTripGenerationBrief({
      name: 'Bad Dates',
      destination: 'Somewhere',
      startDate: '2026-07-23',
      endDate: '2026-07-19',
    })

    expect(normalized.ok).toBe(false)
    if (normalized.ok) return
    expect(normalized.validationErrors.map((error) => error.path)).toContain('dates')
  })

  it('rejects impossible calendar dates in generation briefs', () => {
    const normalized = normalizeTripGenerationBrief({
      name: 'Impossible Dates',
      destination: 'Somewhere',
      startDate: '2026-02-31',
      endDate: '2026-03-02',
    })

    expect(normalized.ok).toBe(false)
    if (normalized.ok) return
    expect(normalized.validationErrors.map((error) => error.path)).toContain('startDate')
  })

  it('scores weak briefs and returns useful follow-up questions', () => {
    const normalized = normalizeTripGenerationBrief({
      name: 'Quick Beach Trip',
      destination: 'Charleston',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      brief: 'Beach.',
    })

    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return
    const quality = scorePlanBrief(normalized.brief)
    expect(quality.draftStrength).toBe('weak')
    expect(quality.questions.map((item) => item.id)).toContain('context')
    expect(quality.missingInputs).toContain('travelers')
  })

  it('matches the Le Blanc pack for common name variants', () => {
    expect(findDestinationPack('Le Blanc Los Cabos')?.id).toBe('le-blanc-los-cabos')
    expect(findDestinationPack('los cabo honeymoon')?.id).toBe('le-blanc-los-cabos')
    expect(findDestinationPack('LeBlanc resort')?.id).toBe('le-blanc-los-cabos')
  })

  it('builds a valid Le Blanc honeymoon draft with must-dos across useful sections', () => {
    const generated = buildDeterministicTrip(leBlancBrief())
    const trip = generated.trip
    const text = allText(trip)

    expect(validateTripForSave(trip)).toHaveLength(0)
    expect(trip.visibility).toBe('unlisted')
    expect(trip.itinerary).toHaveLength(5)
    expect(trip.people.map((person) => person.name)).toEqual(['Logan', 'Morgan'])
    expect(generated.generationSummary.matchedPackId).toBe('le-blanc-los-cabos')
    expect(generated.generationSummary.needsConfirmation.join(' ')).toMatch(/Confirm Play a round of golf/)
    expect(trip.planner?.brief?.destination).toBe('Le Blanc Los Cabo')
    expect(trip.planner?.recommendations?.some((item) => item.category === 'restaurant' && item.confidence === 'high')).toBe(true)
    expect(trip.planner?.miniPlans?.map((plan) => plan.title)).toEqual([
      'Play a round of golf',
      'Ride horses on the beach',
      'Go to Lovers Beach in Cabo',
    ])
    expect(trip.planner?.miniPlans?.find((plan) => plan.title.toLowerCase().includes('golf'))?.nextStep).toMatch(/tee time|transportation|club/i)
    expect(trip.planner?.miniPlans?.find((plan) => plan.title.toLowerCase().includes('horse'))?.packingImplication).toMatch(/closed-toe/i)
    expect(trip.planner?.miniPlans?.find((plan) => plan.title.toLowerCase().includes('lovers'))?.logisticsNote).toMatch(/outside resort|transportation|boat|water taxi/i)
    expect(text).toContain('golf')
    expect(text).toContain('horse')
    expect(text).toContain('lovers beach')
    expect(trip.bookings.some((booking) => booking.title.toLowerCase().includes('golf'))).toBe(true)
    expect(trip.bookings.find((booking) => booking.title.toLowerCase().includes('golf'))?.nextStep).toMatch(/provider|timing|transportation/i)
    expect(trip.checklist.some((item) => item.title.toLowerCase().includes('lovers beach'))).toBe(true)
    expect(trip.thingsToDo.find((item) => item.name.toLowerCase().includes('lovers beach'))?.nextStep).toMatch(/boat|water taxi|logistics/i)
    expect(trip.copyBlocks?.some((block) => block.title === 'Trip link message')).toBe(true)
    expect(trip.planner?.sourceRefs.some((source) => source.kind === 'official')).toBe(true)
    expect(trip.itinerary.some((day) => day.items.some((item) => item.status === 'needs-confirmation' && item.why))).toBe(true)
  })

  it('uses location-aware candidates to place must-dos while keeping arrival and departure light', () => {
    const generated = buildDeterministicTrip(leBlancBrief())
    const trip = generated.trip
    const fullDays = trip.itinerary.slice(1, -1)
    const arrivalItems = trip.itinerary[0].items.map((item) => item.title.toLowerCase()).join(' ')
    const departureItems = trip.itinerary[trip.itinerary.length - 1].items.map((item) => item.title.toLowerCase()).join(' ')

    expect(fullDays.some((day) => day.items.some((item) => /golf/i.test(item.title)))).toBe(true)
    expect(fullDays.some((day) => day.items.some((item) => /horse/i.test(item.title)))).toBe(true)
    expect(fullDays.some((day) => day.items.some((item) => /lovers/i.test(item.title)))).toBe(true)
    expect(arrivalItems).not.toMatch(/golf|horse|lovers/)
    expect(departureItems).not.toMatch(/golf|horse|lovers/)
    expect(trip.itinerary[1].items.length).toBeGreaterThan(trip.itinerary[0].items.length)
  })

  it('does not claim exact distance, travel time, prices, hours, or availability in generated planning language', () => {
    const generated = buildDeterministicTrip(leBlancBrief())
    const trip = generated.trip
    const planningText = JSON.stringify({
      itinerary: trip.itinerary.map((day) => day.items.map((item) => ({ title: item.title, notes: item.notes, why: item.why, nextStep: item.nextStep }))),
      recommendations: trip.planner?.recommendations?.map((item) => ({
        whyItFits: item.whyItFits,
        nextStep: item.nextStep,
        logisticsNote: item.logisticsNote,
      })),
      miniPlans: trip.planner?.miniPlans,
      limitations: trip.planner?.locationLimitations,
    }).toLowerCase()

    expect(planningText).not.toMatch(/\b\d+\s*(minute|minutes|min|mins|mile|miles)\b/)
    expect(planningText).not.toMatch(/\bguaranteed\b|\bavailable at\b|\bexact drive\b/)
    expect(planningText).toContain('confirm transportation')
    expect(planningText).toContain('v1 does not calculate exact distance')
  })

  it('builds event-native drafts with run-of-show, supplies, food, and tasks', () => {
    const normalized = normalizeTripGenerationBrief({
      planType: 'event',
      eventSubtype: 'birthday',
      name: 'Family Birthday',
      destination: 'Backyard',
      startDate: '2026-09-12',
      endDate: '2026-09-12',
      guestCount: '20 people',
      foodPreferences: 'Pizza, cake, drinks, kid snacks',
      mustDos: ['Cake moment', 'Group photo'],
      rawContext: 'Birthday party with cousins and family. Need food, setup, cleanup, and games for kids.',
    })

    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return
    expect(normalized.brief.planType).toBe('event')
    const generated = buildDeterministicTrip(normalized.brief)
    expect(validateTripForSave(generated.trip)).toHaveLength(0)
    expect(generated.trip.kind).toBe('event')
    expect(generated.trip.itinerary[0].title?.toLowerCase()).toContain('birthday')
    expect(generated.trip.eventTasks?.some((item) => item.title.toLowerCase().includes('setup'))).toBe(true)
    expect(generated.trip.supplies?.length).toBeGreaterThan(0)
    expect(generated.trip.food?.length).toBeGreaterThan(0)
  })

  it('preserves event identity when an AI draft omits optional event fields', async () => {
    const normalized = normalizeTripGenerationBrief({
      planType: 'event',
      eventSubtype: 'game-night',
      name: 'Family Game Night',
      destination: 'Toni house',
      startDate: '2026-09-12',
      endDate: '2026-09-12',
      rawContext: 'Family game night with cousins, pizza, setup, cleanup, and a loose run of show.',
      mustDos: ['Pizza', 'Tournament bracket'],
    })

    expect(normalized.ok).toBe(true)
    if (!normalized.ok) return
    const generated = await generateSmartTrip(normalized.brief, {
      aiPlanner: async (_input, context) => {
        const { kind: _kind, eventTasks: _eventTasks, supplies: _supplies, food: _food, ...candidate } = context.fallbackTrip
        void _kind
        void _eventTasks
        void _supplies
        void _food
        return candidate
      },
    })

    expect(generated.generationSummary.source).toBe('ai')
    expect(generated.trip.kind).toBe('event')
    expect(generated.trip.eventTasks?.length).toBeGreaterThan(0)
    expect(generated.trip.supplies?.length).toBeGreaterThan(0)
    expect(generated.trip.food?.length).toBeGreaterThan(0)
    expect(validateTripForSave(generated.trip)).toHaveLength(0)
  })

  it('falls back safely when an AI planner returns malformed trip data', async () => {
    const brief = leBlancBrief()
    const generated = await generateSmartTrip(brief, {
      aiPlanner: async (input, context) => ({
        ...context.fallbackTrip,
        slug: input.slug,
        name: '',
        itinerary: [],
      }),
    })

    expect(generated.generationSummary.source).toBe('ai-fallback')
    expect(generated.trip.planner?.sourceMode).toBe('curated')
    expect(generated.trip.planner?.notes?.join(' ')).toContain('AI planner did not return valid output')
    expect(generated.trip.name).toBe('Logan + Morgan Honeymoon')
    expect(generated.trip.itinerary).toHaveLength(5)
    expect(validateTripForSave(generated.trip)).toHaveLength(0)
  })

  it('keeps live-search source mode visible when the AI planner falls back', async () => {
    const brief = leBlancBrief()
    const generated = await generateSmartTrip(brief, {
      researcher: async () => ({
        usedSearch: true,
        sourceRefs: [
          {
            id: 'src-live-search',
            title: 'Live source',
            url: 'https://los-cabos.leblancsparesorts.com/dining',
            kind: 'search',
          },
        ],
        insights: ['Live source insight.'],
        notes: ['Live web search returned source references for review.'],
      }),
      aiPlanner: async (_input, context) => ({
        ...context.fallbackTrip,
        itinerary: [],
      }),
    })

    expect(generated.generationSummary.source).toBe('ai-fallback')
    expect(generated.trip.planner?.sourceMode).toBe('search')
    expect(generated.generationSummary.notes.join(' ')).toContain('Live web research was used')
    expect(validateTripForSave(generated.trip)).toHaveLength(0)
  })

  it('uses researcher source refs when available and still validates generated fallback', async () => {
    const brief = leBlancBrief()
    const generated = await generateSmartTrip(brief, {
      researcher: async () => ({
        usedSearch: true,
        sourceRefs: [
          {
            id: 'src-official-golf',
            title: 'Official golf page',
            url: 'https://los-cabos.leblancsparesorts.com/experiences/cabo-real-golf-course',
            kind: 'official',
          },
        ],
        insights: ['Golf logistics should be confirmed with the resort.'],
        notes: ['Mocked research bundle.'],
      }),
    })

    expect(validateTripForSave(generated.trip)).toHaveLength(0)
    expect(generated.trip.planner?.sourceMode).toBe('search')
    expect(generated.generationSummary.sourceRefs.some((source) => source.id === 'src-official-golf')).toBe(true)
  })

  it('drops unknown recommendation source ids so generated trips stay valid to store', async () => {
    const brief = leBlancBrief()
    const generated = await generateSmartTrip(brief, {
      researcher: async () => ({
        usedSearch: true,
        sourceRefs: [
          {
            id: 'src-known-restaurant',
            title: 'Known source',
            url: 'https://example.com/known-restaurant-source',
            kind: 'search',
          },
        ],
        insights: ['Known source insight.'],
        notes: ['Mocked research bundle with one valid source.'],
        recommendations: [
          {
            id: 'rec-ai-extra',
            name: 'AI Extra Dinner',
            category: 'restaurant',
            sourceIds: ['src-known-restaurant', 'src-model-invented'],
            bestFor: ['dinner'],
            whyItFits: 'A researched dinner idea from the mocked response.',
            bookingStatus: 'needs-confirmation',
            nextStep: 'Confirm reservation details.',
            confidence: 'medium',
          },
        ],
      }),
    })

    expect(validateTripForSave(generated.trip)).toHaveLength(0)
    const extra = generated.trip.planner?.recommendations?.find((item) => item.id === 'rec-ai-extra')
    expect(extra?.sourceIds).toEqual(['src-known-restaurant'])
  })

  it('accepts valid AI drafts but preserves user facts and strips unsafe invented details', async () => {
    const brief = leBlancBrief()
    const generated = await generateSmartTrip(brief, {
      aiPlanner: async (_input, context) => ({
        ...context.fallbackTrip,
        name: 'Wrong AI Name',
        startDate: '2026-08-01',
        endDate: '2026-08-02',
        bookings: context.fallbackTrip.bookings.map((booking) => ({
          ...booking,
          confirmation: 'AI-MADE-UP-123',
        })),
        people: context.fallbackTrip.people.map((person) => ({
          ...person,
          phone: '+15555550123',
        })),
        contacts: [
          {
            id: 'c-private',
            label: 'Invented private contact',
            value: '+15555550123',
            kind: 'phone',
          },
        ],
        budget: context.fallbackTrip.budget.map((item) => ({
          ...item,
          total: 999,
          status: 'confirmed',
        })),
      }),
    })

    expect(generated.generationSummary.source).toBe('ai')
    expect(generated.trip.name).toBe('Logan + Morgan Honeymoon')
    expect(generated.trip.startDate).toBe('2026-07-19')
    expect(generated.trip.endDate).toBe('2026-07-23')
    expect(generated.trip.bookings.every((booking) => booking.confirmation === undefined)).toBe(true)
    expect(generated.trip.people.every((person) => person.phone === undefined)).toBe(true)
    expect(generated.trip.contacts.some((contact) => contact.id === 'c-private')).toBe(false)
    expect(generated.trip.budget.every((item) => item.total === 0 && item.status !== 'confirmed')).toBe(true)
  })
})
