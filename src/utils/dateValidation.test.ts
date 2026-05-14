import { describe, expect, it } from 'vitest'
import { dateRangeError, isDateWithinRange, isIsoDate, isValidDateRange } from './dateValidation'

describe('date validation helpers', () => {
  it('rejects calendar rollover dates instead of trusting Date parsing', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-31')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('not-a-date')).toBe(false)
  })

  it('explains invalid ranges and accepts same-day plans', () => {
    expect(isValidDateRange('2026-07-19', '2026-07-19')).toBe(true)
    expect(isValidDateRange('2026-07-23', '2026-07-19')).toBe(false)
    expect(dateRangeError('2026-07-23', '2026-07-19')).toBe('End date must be the same day or after the start date.')
  })

  it('checks dates against an inclusive range', () => {
    expect(isDateWithinRange('2026-07-20', '2026-07-19', '2026-07-23')).toBe(true)
    expect(isDateWithinRange('2026-07-24', '2026-07-19', '2026-07-23')).toBe(false)
  })
})
