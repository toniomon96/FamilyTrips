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
    expect(text).toContain('golf')
    expect(text).toContain('horse')
    expect(text).toContain('lovers beach')
    expect(trip.bookings.some((booking) => booking.title.toLowerCase().includes('golf'))).toBe(true)
    expect(trip.checklist.some((item) => item.title.toLowerCase().includes('lovers beach'))).toBe(true)
    expect(trip.copyBlocks?.some((block) => block.title === 'Trip link message')).toBe(true)
    expect(trip.planner?.sourceRefs.some((source) => source.kind === 'official')).toBe(true)
    expect(trip.itinerary.some((day) => day.items.some((item) => item.status === 'needs-confirmation' && item.why))).toBe(true)
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
    expect(generated.trip.planner?.sourceMode).toBe('ai-fallback')
    expect(generated.trip.name).toBe('Logan + Morgan Honeymoon')
    expect(generated.trip.itinerary).toHaveLength(5)
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
