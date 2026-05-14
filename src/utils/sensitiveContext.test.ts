import { describe, expect, it } from 'vitest'
import { findSensitiveContextWarnings } from './sensitiveContext'

describe('sensitive context warnings', () => {
  it('does not warn for normal trip planning context', () => {
    const warnings = findSensitiveContextWarnings('We land at 1:30, want golf, dinner, and beach downtime.')

    expect(warnings).toHaveLength(0)
  })

  it('warns without echoing private values back to the UI', () => {
    const warnings = findSensitiveContextWarnings('Passport 123456789, credit card 4111 1111 1111 1111, confirmation number ABC123.')

    expect(warnings.map((warning) => warning.id)).toEqual([
      'passport-id',
      'payment-card',
      'private-confirmation',
    ])
    expect(JSON.stringify(warnings)).not.toContain('4111')
    expect(JSON.stringify(warnings)).not.toContain('ABC123')
  })
})
