import type { Activity, Booking, BudgetItem, ChecklistItem, Contact, CopyBlock, Day, PackingItem, Person, Trip } from '../types/trip'
import { findDestinationPack, type DestinationPack, type DestinationPackItem } from './destinationPacks.js'
import { makeStableIdFromLabel } from './tripOverrides.js'
import { createTripShell, isValidTripSlug, slugifyTripSlug, validateTripForSave, type TripTemplateId } from './tripShell.js'

export type TripPace = 'very-loose' | 'balanced' | 'packed'
export type TripPlanningHelp = 'mostly-plan-for-me' | 'give-me-options' | 'start-simple'
export type TripMustDoType = 'dining' | 'activity' | 'travel' | 'reservation' | 'reminder' | 'other'
export type TripMustDoTiming = 'any' | 'first-day' | 'middle' | 'last-full-day' | 'specific-date'
export type TripGenerationSource = 'deterministic' | 'ai' | 'ai-fallback'

export type TripMustDo = {
  title: string
  type?: TripMustDoType
  timing?: TripMustDoTiming
  date?: string
  required?: boolean
}

export type TripGenerationBrief = {
  slug?: string
  name: string
  destination: string
  startDate: string
  endDate: string
  template?: TripTemplateId
  travelers?: string
  stayName?: string
  createdBy?: string
  brief?: string
  vibe?: string[]
  pace?: TripPace
  planningHelp?: TripPlanningHelp
  mustDos?: TripMustDo[]
}

export type NormalizedTripMustDo = Required<Pick<TripMustDo, 'title' | 'type' | 'timing' | 'required'>> &
  Pick<TripMustDo, 'date'>

export type NormalizedTripGenerationBrief = {
  slug: string
  name: string
  destination: string
  startDate: string
  endDate: string
  template: TripTemplateId
  travelers: string
  travelerNames: string[]
  stayName: string
  createdBy: string
  brief: string
  vibe: string[]
  pace: TripPace
  planningHelp: TripPlanningHelp
  mustDos: NormalizedTripMustDo[]
}

export type TripGenerationSummary = {
  source: TripGenerationSource
  matchedPackId?: string
  matchedPackName?: string
  notes: string[]
  needsConfirmation: string[]
}

export type TripGenerationResult = {
  trip: Trip
  generationSummary: TripGenerationSummary
}

export type TripGenerationContext = {
  destinationPack?: DestinationPack
  fallbackTrip: Trip
  fallbackSummary: TripGenerationSummary
}

export type TripAiPlanner = (
  input: NormalizedTripGenerationBrief,
  context: TripGenerationContext,
) => Promise<Trip | null>

type NormalizeResult =
  | { ok: true; brief: NormalizedTripGenerationBrief }
  | { ok: false; validationErrors: { path: string; message: string }[] }

const PACE_VALUES = new Set<TripPace>(['very-loose', 'balanced', 'packed'])
const PLANNING_HELP_VALUES = new Set<TripPlanningHelp>(['mostly-plan-for-me', 'give-me-options', 'start-simple'])
const MUST_DO_TYPES = new Set<TripMustDoType>(['dining', 'activity', 'travel', 'reservation', 'reminder', 'other'])
const MUST_DO_TIMINGS = new Set<TripMustDoTiming>(['any', 'first-day', 'middle', 'last-full-day', 'specific-date'])
const TEMPLATE_VALUES = new Set<TripTemplateId>(['general', 'honeymoon', 'beach', 'road', 'event'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let date = startDate
  let guard = 0
  while (date <= endDate && guard < 31) {
    dates.push(date)
    if (date === endDate) break
    date = addDays(date, 1)
    guard += 1
  }
  return dates
}

function parseTravelers(value: string): string[] {
  return value
    .split(/[\n,;]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((name, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index)
}

function inferTemplate(input: {
  template?: unknown
  name: string
  destination: string
  brief: string
  vibe: string[]
}): TripTemplateId {
  if (typeof input.template === 'string' && TEMPLATE_VALUES.has(input.template as TripTemplateId)) {
    return input.template as TripTemplateId
  }
  const text = `${input.name} ${input.destination} ${input.brief} ${input.vibe.join(' ')}`.toLowerCase()
  if (text.includes('honeymoon') || text.includes('romantic') || text.includes('couple')) return 'honeymoon'
  if (text.includes('beach') || text.includes('resort') || text.includes('cabo')) return 'beach'
  if (text.includes('road')) return 'road'
  if (text.includes('party') || text.includes('event')) return 'event'
  return 'general'
}

function inferMustDoType(title: string, value: unknown): TripMustDoType {
  if (typeof value === 'string' && MUST_DO_TYPES.has(value as TripMustDoType)) return value as TripMustDoType
  const normalized = title.toLowerCase()
  if (/dinner|restaurant|lunch|breakfast|bar|food|drink/.test(normalized)) return 'dining'
  if (/flight|airport|transfer|transport|drive/.test(normalized)) return 'travel'
  if (/book|reserve|reservation|confirm/.test(normalized)) return 'reservation'
  if (/pack|bring|remind/.test(normalized)) return 'reminder'
  return 'activity'
}

function inferMustDoTiming(title: string, value: unknown): TripMustDoTiming {
  if (typeof value === 'string' && MUST_DO_TIMINGS.has(value as TripMustDoTiming)) return value as TripMustDoTiming
  const normalized = title.toLowerCase()
  if (/arrival|first/.test(normalized)) return 'first-day'
  if (/last|final|farewell|lovers/.test(normalized)) return 'last-full-day'
  return 'any'
}

function normalizeMustDos(value: unknown): NormalizedTripGenerationBrief['mustDos'] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') {
        const title = item.trim()
        return title
          ? { title, type: inferMustDoType(title, undefined), timing: inferMustDoTiming(title, undefined), required: true }
          : null
      }
      if (!isRecord(item)) return null
      const title = asString(item.title)
      if (!title) return null
      const timing = inferMustDoTiming(title, item.timing)
      return {
        title,
        type: inferMustDoType(title, item.type),
        timing,
        date: timing === 'specific-date' ? asString(item.date) || undefined : undefined,
        required: item.required !== false,
      }
    })
    .filter((item): item is NormalizedTripGenerationBrief['mustDos'][number] => Boolean(item))
    .slice(0, 12)
}

function normalizeVibe(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asString(item).toLowerCase())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, 8)
}

export function normalizeTripGenerationBrief(input: unknown): NormalizeResult {
  if (!isRecord(input)) {
    return { ok: false, validationErrors: [{ path: 'brief', message: 'Trip generation details are required.' }] }
  }

  const name = asString(input.name)
  const destination = asString(input.destination)
  const startDate = asString(input.startDate)
  const endDate = asString(input.endDate)
  const rawSlug = asString(input.slug)
  const slug = slugifyTripSlug(rawSlug || name)
  const errors: { path: string; message: string }[] = []

  if (!name) errors.push({ path: 'name', message: 'Trip name is required.' })
  if (!destination) errors.push({ path: 'destination', message: 'Destination or stay is required.' })
  if (!isIsoDate(startDate)) errors.push({ path: 'startDate', message: 'Start date must be a valid date.' })
  if (!isIsoDate(endDate)) errors.push({ path: 'endDate', message: 'End date must be a valid date.' })
  if (startDate && endDate && startDate > endDate) errors.push({ path: 'dates', message: 'End date must be after start date.' })
  if (!isValidTripSlug(slug)) errors.push({ path: 'slug', message: 'Share URL is invalid.' })

  if (errors.length > 0) return { ok: false, validationErrors: errors }

  const travelers = asString(input.travelers)
  const travelerNames = parseTravelers(travelers)
  const brief = asString(input.brief)
  const vibe = normalizeVibe(input.vibe)
  const template = inferTemplate({ template: input.template, name, destination, brief, vibe })
  const pace = typeof input.pace === 'string' && PACE_VALUES.has(input.pace as TripPace) ? input.pace as TripPace : 'very-loose'
  const planningHelp =
    typeof input.planningHelp === 'string' && PLANNING_HELP_VALUES.has(input.planningHelp as TripPlanningHelp)
      ? input.planningHelp as TripPlanningHelp
      : 'mostly-plan-for-me'
  const pack = findDestinationPack(name, destination, brief)

  return {
    ok: true,
    brief: {
      slug,
      name,
      destination,
      startDate,
      endDate,
      template,
      travelers,
      travelerNames,
      stayName: asString(input.stayName) || pack?.name || destination,
      createdBy: asString(input.createdBy),
      brief,
      vibe,
      pace,
      planningHelp,
      mustDos: normalizeMustDos(input.mustDos),
    },
  }
}

function nextId(prefix: string, label: string, ids: string[]): string {
  const id = makeStableIdFromLabel(prefix, label, ids)
  ids.push(id)
  return id
}

function itemNotes(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

function makePeople(names: string[]): Person[] {
  const ids: string[] = []
  return names.map((name) => ({ id: nextId('p', name, ids), name, role: 'Traveler' }))
}

function packRestaurantActivity(item: DestinationPackItem, ids: string[]): Activity {
  return {
    id: nextId('td', item.name, ids),
    name: item.name,
    category: item.category,
    address: item.address,
    url: item.url,
    notes: itemNotes(item.notes, item.bookingNote ? `Next step: ${item.bookingNote}` : undefined),
  }
}

function makeContactFromPack(item: DestinationPackItem, ids: string[]): Contact {
  const isPhone = item.url?.startsWith('tel:')
  return {
    id: nextId('c', item.name, ids),
    label: item.name,
    value: isPhone ? item.url?.replace(/^tel:/, '') ?? item.notes : item.notes,
    kind: isPhone ? 'phone' : 'text',
    notes: item.category,
  }
}

function findRestaurant(pack: DestinationPack | undefined, idPart: string): DestinationPackItem | undefined {
  return pack?.restaurants.find((item) => item.id.includes(idPart))
}

function findActivity(pack: DestinationPack | undefined, matcher: RegExp): DestinationPackItem | undefined {
  return pack?.activities.find((item) => matcher.test(item.name.toLowerCase()) || matcher.test(item.category.toLowerCase()))
}

function mapMustDoToActivity(mustDo: NormalizedTripGenerationBrief['mustDos'][number], ids: string[]): Activity {
  const title = mustDo.title
  const lower = title.toLowerCase()
  const notes =
    lower.includes('lovers')
      ? 'Priority must-do. Confirm boat or water taxi logistics, weather, and timing before relying on this plan.'
      : lower.includes('horse')
        ? 'Priority must-do. Book the ride and confirm pickup, park fees, weight limits, and what to wear.'
        : lower.includes('golf')
          ? 'Priority must-do. Book tee time, transportation, club rental, and dress code.'
          : 'Priority must-do from the trip brief. Confirm booking details before relying on it.'
  return {
    id: nextId('td', title, ids),
    name: title,
    category: mustDo.type === 'dining' ? 'Dining' : 'Must-do',
    url: lower.includes('lovers')
      ? 'https://maps.google.com/?q=Lovers+Beach+Cabo+San+Lucas'
      : lower.includes('golf')
        ? 'https://maps.google.com/?q=golf+Los+Cabos'
        : undefined,
    notes,
  }
}

function mustDoBookingKind(type: TripMustDoType): Booking['kind'] {
  if (type === 'travel') return 'car'
  if (type === 'dining' || type === 'activity' || type === 'reservation') return 'activity'
  return 'other'
}

function makeChecklist(input: NormalizedTripGenerationBrief, pack?: DestinationPack): ChecklistItem[] {
  const ids: string[] = []
  const items: ChecklistItem[] = [
    {
      id: nextId('ck', 'confirm stay details', ids),
      title: 'Confirm stay, check-in, and room details',
      category: 'Stay',
      done: false,
    },
    {
      id: nextId('ck', 'confirm flights and transportation', ids),
      title: 'Confirm flights and airport transportation',
      category: 'Travel',
      done: false,
    },
    {
      id: nextId('ck', 'reserve priority dinners', ids),
      title: 'Reserve priority resort dinners',
      category: 'Dining',
      done: false,
      notes: pack ? 'Ask Le Blanc concierge or use the app to confirm reservation windows and dress codes.' : undefined,
    },
    {
      id: nextId('ck', 'confirm passports ids', ids),
      title: 'Confirm passports / IDs and travel documents',
      category: 'Travel docs',
      done: false,
    },
    {
      id: nextId('ck', 'share trip link', ids),
      title: 'Share the trip link',
      category: 'Admin',
      done: false,
    },
  ]

  for (const mustDo of input.mustDos) {
    items.push({
      id: nextId('ck', mustDo.title, ids),
      title: `${mustDo.required ? 'Book / confirm' : 'Consider'} ${mustDo.title}`,
      category: mustDo.type === 'dining' ? 'Dining' : 'Activities',
      done: false,
      notes: mustDo.date ? `Preferred date: ${mustDo.date}` : 'Generated from the must-do list.',
    })
  }

  if (pack?.id === 'le-blanc-los-cabos') {
    items.push(
      {
        id: nextId('ck', 'lumiere dinner', ids),
        title: 'Ask concierge about Lumiere for the special dinner',
        category: 'Dining',
        done: false,
        notes: 'Confirm reservation availability, dress code, and current menu.',
      },
      {
        id: nextId('ck', 'activity logistics', ids),
        title: 'Confirm golf, horseback riding, and Lovers Beach logistics',
        category: 'Activities',
        done: false,
        notes: 'Confirm transportation, fees, timing, cancellation rules, and what to wear.',
      },
    )
  }

  return items
}

function makePacking(input: NormalizedTripGenerationBrief): PackingItem[] {
  const ids: string[] = []
  const items: PackingItem[] = [
    { id: nextId('pk', 'passport id', ids), title: 'Passport / photo ID', category: 'Travel docs' },
    { id: nextId('pk', 'phone charger', ids), title: 'Phone charger', category: 'Tech' },
    { id: nextId('pk', 'sunscreen', ids), title: 'Sunscreen', category: 'Beach / Pool' },
    { id: nextId('pk', 'swimwear', ids), title: 'Swimwear', category: 'Beach / Pool' },
    { id: nextId('pk', 'dinner outfits', ids), title: 'Nice dinner outfits', category: 'Clothes' },
    { id: nextId('pk', 'toiletries meds', ids), title: 'Toiletries and medications', category: 'Toiletries' },
  ]
  const text = `${input.brief} ${input.mustDos.map((item) => item.title).join(' ')}`.toLowerCase()
  if (text.includes('golf')) {
    items.push(
      { id: nextId('pk', 'golf outfit', ids), title: 'Golf outfit', category: 'Golf' },
      { id: nextId('pk', 'golf shoes glove', ids), title: 'Golf shoes / glove', category: 'Golf', notes: 'Confirm rental/club plan before packing clubs.' },
    )
  }
  if (text.includes('horse')) {
    items.push({ id: nextId('pk', 'closed toe shoes', ids), title: 'Closed-toe shoes for horseback riding', category: 'Activities' })
  }
  if (text.includes('lovers') || text.includes('boat')) {
    items.push(
      { id: nextId('pk', 'dry bag', ids), title: 'Small dry bag', category: 'Beach / Boat' },
      { id: nextId('pk', 'water shoes', ids), title: 'Water shoes or sandals', category: 'Beach / Boat' },
    )
  }
  return items
}

function makeBudget(input: NormalizedTripGenerationBrief): BudgetItem[] {
  const ids: string[] = []
  const items: BudgetItem[] = [
    {
      id: nextId('b', 'airport transportation', ids),
      name: 'Airport transportation',
      total: 0,
      splitCount: Math.max(1, input.travelerNames.length || 1),
      status: 'tbd',
      notes: 'Update after transportation is booked.',
    },
    {
      id: nextId('b', 'tips misc', ids),
      name: 'Tips and miscellaneous',
      total: 0,
      splitCount: Math.max(1, input.travelerNames.length || 1),
      status: 'tbd',
      notes: 'Casual placeholder for cash, tips, souvenirs, and unplanned costs.',
    },
  ]
  for (const mustDo of input.mustDos) {
    items.push({
      id: nextId('b', mustDo.title, ids),
      name: mustDo.title,
      total: 0,
      splitCount: Math.max(1, input.travelerNames.length || 1),
      status: 'tbd',
      notes: 'Update after booking or confirming price.',
    })
  }
  return items
}

function makeBookings(input: NormalizedTripGenerationBrief, pack?: DestinationPack): Booking[] {
  const ids: string[] = []
  const bookings: Booking[] = [
    {
      id: nextId('bk', input.stayName, ids),
      kind: 'stay',
      title: input.stayName,
      when: input.startDate,
      details: 'Add confirmation number and exact check-in details after booking is confirmed.',
    },
    {
      id: nextId('bk', 'airport transportation', ids),
      kind: 'car',
      title: 'Airport transportation',
      when: input.startDate,
      details: 'Confirm airport pickup/dropoff, driver contact, and timing.',
    },
  ]

  for (const mustDo of input.mustDos) {
    bookings.push({
      id: nextId('bk', mustDo.title, ids),
      kind: mustDoBookingKind(mustDo.type),
      title: mustDo.title,
      when: mustDo.date,
      details: 'Generated from the must-do list. Confirm time, provider, cost, transportation, and cancellation details.',
    })
  }

  if (pack?.id === 'le-blanc-los-cabos') {
    bookings.push({
      id: nextId('bk', 'Lumiere dinner reservation', ids),
      kind: 'activity',
      title: 'Lumiere dinner reservation',
      when: input.endDate,
      link: 'https://los-cabos.leblancsparesorts.com/dining/lumiere',
      details: 'Special honeymoon dinner idea. Confirm date, reservation availability, dress code, and current menu.',
    })
  }

  return bookings
}

function chooseDinnerForDay(index: number, isLastFullDay: boolean, pack?: DestinationPack): DestinationPackItem | undefined {
  if (!pack) return undefined
  if (isLastFullDay) return findRestaurant(pack, 'lumiere')
  const order = ['ocean', 'bella', 'yama', 'blanc', 'habibi', 'blanc-pizza']
  return findRestaurant(pack, order[index % order.length])
}

function placeMustDos(input: NormalizedTripGenerationBrief, dates: string[]): Map<string, NormalizedTripGenerationBrief['mustDos']> {
  const map = new Map<string, NormalizedTripGenerationBrief['mustDos']>()
  const fullDays = dates.length > 2 ? dates.slice(1, -1) : dates
  const middleDays = fullDays.length ? fullDays : dates
  let cursor = 0

  for (const item of input.mustDos) {
    let date = item.date && dates.includes(item.date) ? item.date : ''
    if (!date && item.timing === 'first-day') date = dates[0]
    if (!date && item.timing === 'last-full-day') date = dates.length > 2 ? dates[dates.length - 2] : dates[dates.length - 1]
    if (!date) {
      const lower = item.title.toLowerCase()
      if (lower.includes('golf')) date = middleDays[0] ?? dates[0]
      else if (lower.includes('horse')) date = middleDays[Math.min(1, middleDays.length - 1)] ?? dates[0]
      else if (lower.includes('lovers')) date = middleDays[middleDays.length - 1] ?? dates[dates.length - 1]
      else {
        date = middleDays[cursor % middleDays.length] ?? dates[0]
        cursor += 1
      }
    }
    map.set(date, [...(map.get(date) ?? []), item])
  }

  return map
}

function makeItinerary(input: NormalizedTripGenerationBrief, pack?: DestinationPack): Day[] {
  const dates = dateRange(input.startDate, input.endDate)
  const mustDosByDate = placeMustDos(input, dates)
  const spa = findActivity(pack, /spa|wellness/)
  const pool = findActivity(pack, /pool|beach downtime/)
  const days: Day[] = []

  dates.forEach((date, index) => {
    const isFirst = index === 0
    const isLast = index === dates.length - 1
    const isLastFullDay = dates.length > 2 && index === dates.length - 2
    const assignedMustDos = mustDosByDate.get(date) ?? []
    const dinner = chooseDinnerForDay(index, isLastFullDay, pack)
    const items: Day['items'] = []

    if (isFirst) {
      items.push(
        {
          title: 'Arrive, check in, and settle into the resort',
          notes: 'Keep the first day intentionally light. Add flight and transfer times once confirmed.',
          address: pack?.address ?? input.destination,
        },
        {
          title: dinner ? `Easy dinner at ${dinner.name}` : 'Easy arrival dinner',
          notes: dinner ? `${dinner.notes} Confirm reservation needs before relying on this.` : 'Choose something low-effort after travel.',
          link: dinner?.url,
        },
      )
    } else if (isLast) {
      items.push(
        {
          title: 'Slow breakfast and pack up',
          notes: 'Use this as the checkout buffer. Confirm checkout time with the resort.',
        },
        {
          title: 'Checkout and airport transfer',
          notes: 'Add pickup time, flight time, and driver details once confirmed.',
        },
      )
    } else {
      items.push({
        time: 'Morning',
        title: index === 1 && spa ? `${spa.name} or slow resort morning` : 'Slow resort morning',
        notes: index === 1 && spa ? spa.notes : 'Keep the morning flexible for breakfast, pool, and recovery.',
        link: index === 1 ? spa?.url : undefined,
      })
    }

    for (const mustDo of assignedMustDos) {
      items.push({
        time: isFirst || isLast ? undefined : 'Afternoon',
        title: mustDo.title,
        notes: itemNotes(
          'Priority item from the trip brief.',
          mustDo.title.toLowerCase().includes('lovers')
            ? 'Confirm boat or water taxi logistics and weather before going.'
            : undefined,
          mustDo.title.toLowerCase().includes('horse')
            ? 'Confirm pickup, park fees, weight limits, and clothing.'
            : undefined,
          mustDo.title.toLowerCase().includes('golf')
            ? 'Confirm tee time, transportation, club rentals, and dress code.'
            : undefined,
        ),
      })
    }

    if (!isFirst && !isLast) {
      items.push({
        time: 'Late afternoon',
        title: pool?.name ?? 'Pool, beach, or room reset',
        notes: pool?.notes ?? 'Leave open space before dinner.',
      })
      items.push({
        time: 'Dinner',
        title: dinner ? `Dinner at ${dinner.name}` : 'Dinner reservation',
        notes: dinner ? `${dinner.notes} Confirm reservation and dress code.` : 'Pick a dinner spot and add reservation details.',
        link: dinner?.url,
      })
    }

    days.push({
      date,
      title: isFirst ? 'Arrival and easy resort night' : isLast ? 'Checkout and travel day' : isLastFullDay ? 'Final full honeymoon day' : `Day ${index + 1}`,
      items,
    })
  })

  return days
}

function makeCopyBlocks(input: NormalizedTripGenerationBrief, summary: TripGenerationSummary): CopyBlock[] {
  const firstNames = input.travelerNames.length ? input.travelerNames.join(' + ') : input.name
  return [
    {
      id: 'msg-trip-link',
      title: 'Trip link message',
      body: `Here is the ${firstNames} trip plan. It has the loose schedule, dinner ideas, must-do activities, checklist, packing, and notes. A few reservations still need to be confirmed before we rely on the exact details.`,
    },
    {
      id: 'msg-confirmation-list',
      title: 'Confirmation list',
      body: summary.needsConfirmation.map((item) => `- ${item}`).join('\n'),
    },
  ]
}

function makeSummary(input: NormalizedTripGenerationBrief, pack?: DestinationPack, source: TripGenerationSource = 'deterministic'): TripGenerationSummary {
  const mustDoConfirmations = input.mustDos.map((item) => `Confirm ${item.title}`)
  const needsConfirmation = [
    'Confirm flights and airport transportation',
    'Confirm stay confirmation number and exact check-in/check-out times',
    'Confirm dinner reservations, dress codes, and current menus',
    ...mustDoConfirmations,
  ]
  if (pack?.id === 'le-blanc-los-cabos') {
    needsConfirmation.push('Ask Le Blanc concierge about current Blanc Experiences, spa availability, and activity logistics')
  }

  return {
    source,
    matchedPackId: pack?.id,
    matchedPackName: pack?.name,
    notes: [
      source === 'ai' ? 'AI generated the first draft using the curated destination pack as context.' : 'Deterministic smart draft generated from the trip brief.',
      ...(pack?.planningNotes ?? []),
    ],
    needsConfirmation,
  }
}

export function buildDeterministicTrip(input: NormalizedTripGenerationBrief): TripGenerationResult {
  const pack = findDestinationPack(input.name, input.destination, input.brief)
  const base = createTripShell({
    slug: input.slug,
    name: input.name,
    location: pack?.name ?? input.destination,
    startDate: input.startDate,
    endDate: input.endDate,
    template: input.template,
    travelers: input.travelers,
    stayName: input.stayName,
    createdBy: input.createdBy,
  })
  const summary = makeSummary(input, pack)
  const activityIds: string[] = []
  const thingsToDo: Activity[] = [
    ...(pack?.restaurants.map((item) => packRestaurantActivity(item, activityIds)) ?? []),
    ...(pack?.activities.map((item) => packRestaurantActivity(item, activityIds)) ?? []),
  ]
  for (const mustDo of input.mustDos) thingsToDo.push(mapMustDoToActivity(mustDo, activityIds))

  const contactIds: string[] = []
  const contacts: Contact[] = [
    ...(pack?.contacts.map((item) => makeContactFromPack(item, contactIds)) ?? []),
    { id: nextId('c', 'emergency', contactIds), label: 'Emergency', value: '911', kind: 'phone' },
  ]

  const trip: Trip = {
    ...base,
    location: pack?.name ?? input.destination,
    tagline: input.template === 'honeymoon'
      ? 'A loose honeymoon plan with room for the resort, romance, and a few can-not-miss moments'
      : 'A smart first draft ready for quick edits',
    stay: {
      ...base.stay,
      name: input.stayName,
      address: pack?.address ?? input.destination,
      hostPhone: pack?.phone,
      amenities: [
        ...(pack ? ['Butler service / resort concierge', 'Fine dining', 'Spa and wellness', 'Pool and beach downtime'] : base.stay.amenities),
      ],
      notes: itemNotes(
        'Generated smart draft. Confirm reservation numbers, exact times, and availability before relying on the details.',
        pack ? `Destination pack matched: ${pack.name}.` : undefined,
      ),
    },
    bookings: makeBookings(input, pack),
    itinerary: makeItinerary(input, pack),
    thingsToDo,
    people: input.travelerNames.length ? makePeople(input.travelerNames) : base.people,
    contacts,
    checklist: makeChecklist(input, pack),
    packing: makePacking(input),
    copyBlocks: makeCopyBlocks(input, summary),
    budget: makeBudget(input),
  }

  return { trip, generationSummary: summary }
}

function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls)
  if (!isRecord(value)) return value
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (child !== null) next[key] = stripNulls(child)
  }
  return next
}

function sanitizedAiBookings(bookings: Booking[]): Booking[] {
  return bookings.map((booking) => {
    const { confirmation, ...safeBooking } = booking
    void confirmation
    return safeBooking
  })
}

function sanitizedAiBudget(budget: BudgetItem[]): BudgetItem[] {
  return budget.map((item) => ({
    ...item,
    total: 0,
    status: item.status === 'confirmed' ? 'tbd' : item.status ?? 'tbd',
    notes: item.notes ?? 'Generated placeholder. Update after confirming the real amount.',
  }))
}

function normalizeAiTrip(candidate: Trip, fallback: Trip): Trip {
  return {
    ...candidate,
    slug: fallback.slug,
    name: fallback.name,
    startDate: fallback.startDate,
    endDate: fallback.endDate,
    visibility: 'unlisted',
    currency: candidate.currency || fallback.currency || '$',
    kind: candidate.kind === 'event' ? 'event' : candidate.kind === 'trip' ? 'trip' : undefined,
    stay: candidate.stay ?? fallback.stay,
    bookings: sanitizedAiBookings(Array.isArray(candidate.bookings) ? candidate.bookings : fallback.bookings),
    itinerary: Array.isArray(candidate.itinerary) ? candidate.itinerary : fallback.itinerary,
    thingsToDo: Array.isArray(candidate.thingsToDo) ? candidate.thingsToDo : fallback.thingsToDo,
    people: fallback.people,
    contacts: fallback.contacts,
    checklist: Array.isArray(candidate.checklist) ? candidate.checklist : fallback.checklist,
    packing: Array.isArray(candidate.packing) ? candidate.packing : fallback.packing,
    copyBlocks: Array.isArray(candidate.copyBlocks) ? candidate.copyBlocks : fallback.copyBlocks,
    budget: sanitizedAiBudget(Array.isArray(candidate.budget) ? candidate.budget : fallback.budget),
  }
}

function itineraryMatchesFallbackDates(candidate: Trip, fallback: Trip): boolean {
  if (candidate.itinerary.length !== fallback.itinerary.length) return false
  const fallbackDates = fallback.itinerary.map((day) => day.date)
  return candidate.itinerary.every((day, index) => day.date === fallbackDates[index])
}

const MUST_DO_STOP_WORDS = new Set([
  'and',
  'beach',
  'cabo',
  'go',
  'play',
  'ride',
  'round',
  'the',
  'to',
])

function mustDoKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/g)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !MUST_DO_STOP_WORDS.has(word))
}

function includesRequiredMustDos(candidate: Trip, mustDos: NormalizedTripGenerationBrief['mustDos']): boolean {
  const text = JSON.stringify(candidate).toLowerCase()
  return mustDos
    .filter((item) => item.required)
    .every((item) => {
      const keywords = mustDoKeywords(item.title)
      return keywords.length === 0 || keywords.some((keyword) => text.includes(keyword))
    })
}

export async function generateSmartTrip(
  input: NormalizedTripGenerationBrief,
  options: { aiPlanner?: TripAiPlanner } = {},
): Promise<TripGenerationResult> {
  const fallback = buildDeterministicTrip(input)
  const pack = findDestinationPack(input.name, input.destination, input.brief)
  if (!options.aiPlanner) return fallback

  try {
    const aiTrip = await options.aiPlanner(input, {
      destinationPack: pack,
      fallbackTrip: fallback.trip,
      fallbackSummary: fallback.generationSummary,
    })
    if (!aiTrip) return { ...fallback, generationSummary: { ...fallback.generationSummary, source: 'ai-fallback' } }
    const candidate = normalizeAiTrip(stripNulls(aiTrip) as Trip, fallback.trip)
    const validationErrors = validateTripForSave(candidate)
    if (
      validationErrors.length > 0 ||
      !itineraryMatchesFallbackDates(candidate, fallback.trip) ||
      !includesRequiredMustDos(candidate, input.mustDos)
    ) {
      return { ...fallback, generationSummary: { ...fallback.generationSummary, source: 'ai-fallback' } }
    }
    return {
      trip: candidate,
      generationSummary: makeSummary(input, pack, 'ai'),
    }
  } catch {
    return { ...fallback, generationSummary: { ...fallback.generationSummary, source: 'ai-fallback' } }
  }
}
