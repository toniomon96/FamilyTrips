import { describe, expect, it } from 'vitest'
import type { Trip } from '../types/trip'
import { findDestinationPack } from './destinationPacks'
import {
  buildDeterministicTrip,
  generateSmartTrip,
  normalizeTripGenerationBrief,
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
    expect(generated.trip.name).toBe('Logan + Morgan Honeymoon')
    expect(generated.trip.itinerary).toHaveLength(5)
    expect(validateTripForSave(generated.trip)).toHaveLength(0)
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
