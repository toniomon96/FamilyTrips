import { describe, expect, it } from 'vitest'
import { okc } from '../data/trips/okc'
import {
  applyTripOverride,
  dynamicTripFromRow,
  editableFieldsFromTrip,
  makeStableIdFromLabel,
  normalizeTripOverrideData,
  validateEditableTrip,
} from './tripOverrides'

describe('trip override helpers', () => {
  it('applies editable fields while keeping the seed slug immutable', () => {
    const merged = applyTripOverride(okc, {
      slug: 'evil-slug',
      name: 'Updated OKC',
      location: 'Oklahoma City',
    })

    expect(merged.slug).toBe('okc')
    expect(merged.name).toBe('Updated OKC')
    expect(merged.location).toBe('Oklahoma City')
  })

  it('filters non-editable override keys', () => {
    const data = normalizeTripOverrideData({
      slug: 'other',
      name: 'Trip name',
      unknown: 'ignored',
    })

    expect(data).toEqual({ name: 'Trip name' })
  })

  it('normalizes dynamic trip rows into full trips', () => {
    const trip = dynamicTripFromRow({
      trip_slug: 'dynamic-okc',
      data: { ...editableFieldsFromTrip(okc), name: 'Dynamic OKC', visibility: 'unlisted' },
      version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'creator',
      source: 'dynamic',
      visibility: 'listed',
    })

    expect(trip?.slug).toBe('dynamic-okc')
    expect(trip?.name).toBe('Dynamic OKC')
    expect(trip?.visibility).toBe('listed')
  })

  it('creates stable unique ids from labels', () => {
    expect(makeStableIdFromLabel('ck', 'Confirm Tee Time!', [])).toBe('ck-confirm-tee-time')
    expect(makeStableIdFromLabel('ck', 'Confirm Tee Time!', ['ck-confirm-tee-time'])).toBe(
      'ck-confirm-tee-time-2',
    )
  })

  it('validates merged editable trip data and falls back cleanly on bad shapes', () => {
    const editable = editableFieldsFromTrip(okc)
    const valid = validateEditableTrip(okc, { ...editable, name: 'OKC edited' })
    const invalid = validateEditableTrip(okc, { ...editable, startDate: '2026-06-01' })
    const badShape = validateEditableTrip(okc, { ...editable, itinerary: null })

    expect(valid).toHaveLength(0)
    expect(invalid.map((error) => error.message)).toContain('Start date is after end date.')
    expect(badShape.map((error) => error.message)).toContain('Trip data has an invalid shape.')
  })
})
