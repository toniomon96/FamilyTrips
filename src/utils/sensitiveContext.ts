export type SensitiveContextWarning = {
  id: string
  label: string
  description: string
}

type SensitiveRule = SensitiveContextWarning & {
  pattern: RegExp
}

const SENSITIVE_RULES: SensitiveRule[] = [
  {
    id: 'passport-id',
    label: 'Passport or government ID',
    description: 'Keep passport numbers, driver license numbers, Social Security numbers, and private IDs out of the planning brief.',
    pattern: /\b(passport|social security|ssn|driver'?s license|government id)\b/i,
  },
  {
    id: 'payment-card',
    label: 'Payment details',
    description: 'Do not paste credit card numbers, CVV codes, bank details, or payment credentials.',
    pattern: /\b(credit card|debit card|card number|cvv|cvc|routing number|bank account)\b|(?:\d[ -]?){13,19}/i,
  },
  {
    id: 'private-confirmation',
    label: 'Private confirmation number',
    description: 'It is fine to say something is booked, but avoid pasting private confirmation codes until stronger privacy is added.',
    pattern: /\b(confirmation number|confirmation code|booking code|record locator|reservation code|conf(?:irmation)?\s*#)\b/i,
  },
  {
    id: 'private-password',
    label: 'Password or access code',
    description: 'Do not paste passwords, door codes, alarm codes, or account access details into the smart planner.',
    pattern: /\b(password|passcode|door code|gate code|alarm code|access code)\b/i,
  },
]

export function findSensitiveContextWarnings(text: string): SensitiveContextWarning[] {
  if (!text.trim()) return []
  return SENSITIVE_RULES
    .filter((rule) => rule.pattern.test(text))
    .map(({ id, label, description }) => ({ id, label, description }))
}
