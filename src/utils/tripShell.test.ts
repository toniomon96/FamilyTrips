import { describe, expect, it } from 'vitest'
import { createTripShell, isValidTripSlug, slugifyTripSlug, validateTripForSave } from './tripShell'

describe('trip shell helpers', () => {
  it('creates clean share slugs from trip names', () => {
    expect(slugifyTripSlug('Logan + Morgan Honeymoon!')).toBe('logan-morgan-honeymoon')
    expect(isValidTripSlug('logan-morgan-honeymoon')).toBe(true)
    expect(isValidTripSlug('-bad-slug')).toBe(false)
  })

  it('creates a valid unlisted honeymoon shell', () => {
    const trip = createTripShell({
      name: 'Logan Morgan Honeymoon',
      location: 'Le Blanc Spa Resort Los Cabos',
      startDate: '2026-07-19',
      endDate: '2026-07-23',
      template: 'honeymoon',
      travelers: 'Logan, Morgan',
      stayName: 'Le Blanc Spa Resort Los Cabos',
    })

    expect(trip.slug).toBe('logan-morgan-honeymoon')
    expect(trip.visibility).toBe('unlisted')
    expect(trip.people.map((person) => person.name)).toEqual(['Logan', 'Morgan'])
    expect(trip.itinerary).toHaveLength(5)
    expect(validateTripForSave(trip)).toHaveLength(0)
  })

  it('honors a provided share slug when creating a shell', () => {
    const trip = createTripShell({
      slug: 'le-blanc-honeymoon',
      name: 'Logan Morgan Honeymoon',
      location: 'Le Blanc Spa Resort Los Cabos',
      startDate: '2026-07-19',
      endDate: '2026-07-23',
      template: 'honeymoon',
    })

    expect(trip.slug).toBe('le-blanc-honeymoon')
    expect(validateTripForSave(trip)).toHaveLength(0)
  })

  it('creates a valid event shell without duplicate checklist/task ids', () => {
    const trip = createTripShell({
      name: 'Family Cookout',
      location: 'Backyard',
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      template: 'event',
    })

    expect(trip.kind).toBe('event')
    expect(trip.checklist).toHaveLength(0)
    expect(trip.eventTasks?.length).toBeGreaterThan(0)
    expect(validateTripForSave(trip)).toHaveLength(0)
  })

  it('returns validation errors for invalid shells', () => {
    const trip = createTripShell({
      name: 'Bad Dates',
      location: 'Somewhere',
      startDate: '2026-07-23',
      endDate: '2026-07-19',
      template: 'general',
    })

    expect(validateTripForSave(trip).map((error) => error.message)).toContain('Start date is after end date.')
  })
})
