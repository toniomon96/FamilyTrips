import { describe, expect, it, beforeEach } from 'vitest'
import {
  assertBodySize,
  checkRateLimitForKey,
  RequestGuardError,
  resetRequestGuardsForTests,
} from './_requestGuards'

describe('API request guards', () => {
  beforeEach(() => {
    resetRequestGuardsForTests()
  })

  it('allows requests within the rate window and rejects excess traffic', () => {
    expect(checkRateLimitForKey('trips:test-ip', 1000, { limit: 2, windowMs: 1000 }).ok).toBe(true)
    expect(checkRateLimitForKey('trips:test-ip', 1100, { limit: 2, windowMs: 1000 }).ok).toBe(true)

    const rejected = checkRateLimitForKey('trips:test-ip', 1200, { limit: 2, windowMs: 1000 })

    expect(rejected.ok).toBe(false)
    expect(rejected.retryAfterSeconds).toBe(1)
  })

  it('resets the rate window after the cooldown expires', () => {
    expect(checkRateLimitForKey('trips:test-ip', 1000, { limit: 1, windowMs: 1000 }).ok).toBe(true)
    expect(checkRateLimitForKey('trips:test-ip', 1500, { limit: 1, windowMs: 1000 }).ok).toBe(false)
    expect(checkRateLimitForKey('trips:test-ip', 2100, { limit: 1, windowMs: 1000 }).ok).toBe(true)
  })

  it('throws a clear request-size error for oversized briefs', () => {
    expect(() => assertBodySize(12, 12)).not.toThrow()

    try {
      assertBodySize(13, 12)
      throw new Error('Expected assertBodySize to throw.')
    } catch (error) {
      expect(error).toBeInstanceOf(RequestGuardError)
      expect((error as RequestGuardError).status).toBe(413)
      expect((error as RequestGuardError).publicMessage).toMatch(/too large/i)
    }
  })
})
