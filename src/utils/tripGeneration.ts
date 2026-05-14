import type {
  Activity,
  Booking,
  BudgetItem,
  ChecklistItem,
  Contact,
  CopyBlock,
  Day,
  DraftStrength,
  PackingItem,
  Person,
  PlannerSourceRef,
  PlanItemStatus,
  Trip,
} from '../types/trip'
import { findDestinationPack, type DestinationPack, type DestinationPackItem } from './destinationPacks.js'
import { makeStableIdFromLabel } from './tripOverrides.js'
import { createTripShell, isValidTripSlug, slugifyTripSlug, validateTripForSave, type TripTemplateId } from './tripShell.js'

export type TripPace = 'very-loose' | 'balanced' | 'packed'
export type TripPlanningHelp = 'mostly-plan-for-me' | 'give-me-options' | 'start-simple'
export type TripMustDoType = 'dining' | 'activity' | 'travel' | 'reservation' | 'reminder' | 'other'
export type TripMustDoTiming = 'any' | 'first-day' | 'middle' | 'last-full-day' | 'specific-date'
export type TripGenerationSource = 'deterministic' | 'ai' | 'ai-fallback'
export type PlanType = 'trip' | 'event'
export type EventSubtype =
  | 'birthday'
  | 'gathering'
  | 'game-night'
  | 'youth-sports'
  | 'pro-sports'
  | 'amusement'
  | 'family-gathering'
  | 'wedding'
  | 'bachelor-party'
  | 'shower'
  | 'party'
  | 'other'
export type MustDoPriority = 'required' | 'nice-to-have'
export type BookingStatus = 'confirmed' | 'needs-booking' | 'needs-confirmation' | 'idea'

export type TripMustDo = {
  title: string
  type?: TripMustDoType
  timing?: TripMustDoTiming
  date?: string
  required?: boolean
  priority?: MustDoPriority
  bookingStatus?: BookingStatus
  logistics?: string
  location?: string
  duration?: string
  why?: string
}

export type TripGenerationBrief = {
  slug?: string
  name?: string
  destination?: string
  locationText?: string
  planType?: PlanType
  eventSubtype?: EventSubtype
  startDate?: string
  endDate?: string
  template?: TripTemplateId
  travelers?: string
  guestCount?: string
  kidsAndAges?: string
  mobilityNotes?: string
  foodPreferences?: string
  budgetStyle?: string
  arrivalWindow?: string
  departureWindow?: string
  stayName?: string
  stayAddress?: string
  venueName?: string
  venueAddress?: string
  createdBy?: string
  brief?: string
  rawContext?: string
  sourceText?: string
  links?: string[]
  vibe?: string[]
  pace?: TripPace
  planningHelp?: TripPlanningHelp
  mustDos?: TripMustDo[]
  niceToHaves?: TripMustDo[] | string[]
  confirmedItems?: TripMustDo[] | string[]
  followUpAnswers?: string[]
}

export type NormalizedTripMustDo = Required<Pick<TripMustDo, 'title' | 'type' | 'timing' | 'required'>> &
  Pick<TripMustDo, 'date' | 'priority' | 'bookingStatus' | 'logistics' | 'location' | 'duration' | 'why'>

export type NormalizedTripGenerationBrief = {
  slug: string
  name: string
  destination: string
  locationText: string
  planType: PlanType
  eventSubtype?: EventSubtype
  startDate: string
  endDate: string
  template: TripTemplateId
  travelers: string
  travelerNames: string[]
  guestCount: string
  kidsAndAges: string
  mobilityNotes: string
  foodPreferences: string
  budgetStyle: string
  arrivalWindow: string
  departureWindow: string
  stayName: string
  stayAddress: string
  venueName: string
  venueAddress: string
  createdBy: string
  brief: string
  rawContext: string
  sourceText: string
  links: string[]
  vibe: string[]
  pace: TripPace
  planningHelp: TripPlanningHelp
  mustDos: NormalizedTripMustDo[]
  niceToHaves: NormalizedTripMustDo[]
  confirmedItems: NormalizedTripMustDo[]
  followUpAnswers: string[]
}

export type BriefQuestion = {
  id: string
  question: string
  reason: string
}

export type BriefQuality = {
  score: number
  draftStrength: DraftStrength
  missingInputs: string[]
  warnings: string[]
  questions: BriefQuestion[]
}

export type ResearchBundle = {
  sourceRefs: PlannerSourceRef[]
  insights: string[]
  notes: string[]
  usedSearch: boolean
}

export type TripGenerationSummary = {
  source: TripGenerationSource
  matchedPackId?: string
  matchedPackName?: string
  draftStrength: DraftStrength
  notes: string[]
  needsConfirmation: string[]
  missingInputs: string[]
  questions: BriefQuestion[]
  sourceRefs: PlannerSourceRef[]
}

export type TripGenerationResult = {
  trip: Trip
  generationSummary: TripGenerationSummary
}

export type TripGenerationContext = {
  destinationPack?: DestinationPack
  fallbackTrip: Trip
  fallbackSummary: TripGenerationSummary
  research: ResearchBundle
}

export type TripAiPlanner = (
  input: NormalizedTripGenerationBrief,
  context: TripGenerationContext,
) => Promise<Trip | null>

export type TripResearcher = (
  input: NormalizedTripGenerationBrief,
  quality: BriefQuality,
) => Promise<ResearchBundle | null>

type NormalizeResult =
  | { ok: true; brief: NormalizedTripGenerationBrief }
  | { ok: false; validationErrors: { path: string; message: string }[] }

const PACE_VALUES = new Set<TripPace>(['very-loose', 'balanced', 'packed'])
const PLANNING_HELP_VALUES = new Set<TripPlanningHelp>(['mostly-plan-for-me', 'give-me-options', 'start-simple'])
const MUST_DO_TYPES = new Set<TripMustDoType>(['dining', 'activity', 'travel', 'reservation', 'reminder', 'other'])
const MUST_DO_TIMINGS = new Set<TripMustDoTiming>(['any', 'first-day', 'middle', 'last-full-day', 'specific-date'])
const TEMPLATE_VALUES = new Set<TripTemplateId>(['general', 'honeymoon', 'beach', 'road', 'event'])
const PLAN_TYPE_VALUES = new Set<PlanType>(['trip', 'event'])
const EVENT_SUBTYPE_VALUES = new Set<EventSubtype>([
  'birthday',
  'gathering',
  'game-night',
  'youth-sports',
  'pro-sports',
  'amusement',
  'family-gathering',
  'wedding',
  'bachelor-party',
  'shower',
  'party',
  'other',
])
const BOOKING_STATUS_VALUES = new Set<BookingStatus>(['confirmed', 'needs-booking', 'needs-confirmation', 'idea'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, 12)
}

function splitLines(value: string): string[] {
  return value
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
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

function inferPlanType(input: {
  planType?: unknown
  template?: unknown
  name: string
  destination: string
  brief: string
  sourceText: string
}): PlanType {
  if (typeof input.planType === 'string' && PLAN_TYPE_VALUES.has(input.planType as PlanType)) {
    return input.planType as PlanType
  }
  if (input.template === 'event') return 'event'
  const text = `${input.name} ${input.destination} ${input.brief} ${input.sourceText}`.toLowerCase()
  if (/birthday|party|gathering|game night|wedding|shower|bachelor|cookout|tailgate|tournament|sports game|youth sports/.test(text)) {
    return 'event'
  }
  return 'trip'
}

function inferEventSubtype(value: unknown, text: string): EventSubtype | undefined {
  if (typeof value === 'string' && EVENT_SUBTYPE_VALUES.has(value as EventSubtype)) return value as EventSubtype
  const normalized = text.toLowerCase()
  if (/birthday/.test(normalized)) return 'birthday'
  if (/game night/.test(normalized)) return 'game-night'
  if (/wedding/.test(normalized)) return 'wedding'
  if (/bachelor/.test(normalized)) return 'bachelor-party'
  if (/shower/.test(normalized)) return 'shower'
  if (/youth|kids|tournament|football|baseball|pickleball/.test(normalized)) return 'youth-sports'
  if (/pro sports|professional|stadium|arena/.test(normalized)) return 'pro-sports'
  if (/amusement|theme park/.test(normalized)) return 'amusement'
  if (/family/.test(normalized)) return 'family-gathering'
  if (/party/.test(normalized)) return 'party'
  if (/gathering|cookout/.test(normalized)) return 'gathering'
  return undefined
}

function inferName(name: string, destination: string, planType: PlanType): string {
  if (name) return name
  const destinationPart = destination || (planType === 'event' ? 'Family Event' : 'Family Trip')
  return planType === 'event' ? `${destinationPart} Plan` : `${destinationPart} Trip`
}

function inferTemplate(input: {
  template?: unknown
  planType?: PlanType
  name: string
  destination: string
  brief: string
  vibe: string[]
}): TripTemplateId {
  if (typeof input.template === 'string' && TEMPLATE_VALUES.has(input.template as TripTemplateId)) {
    return input.template as TripTemplateId
  }
  if (input.planType === 'event') return 'event'
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
  const sourceItems = Array.isArray(value) ? value : typeof value === 'string' ? splitLines(value) : []
  const result: NormalizedTripGenerationBrief['mustDos'] = []
  for (const item of sourceItems) {
    if (typeof item === 'string') {
      const title = item.trim()
      if (title) {
        result.push({
          title,
          type: inferMustDoType(title, undefined),
          timing: inferMustDoTiming(title, undefined),
          required: true,
          priority: 'required',
          bookingStatus: 'needs-confirmation',
        })
      }
      continue
    }
    if (!isRecord(item)) continue
    const title = asString(item.title)
    if (!title) continue
    const timing = inferMustDoTiming(title, item.timing)
    const priority: MustDoPriority = item.priority === 'nice-to-have' || item.required === false ? 'nice-to-have' : 'required'
    const bookingStatus: BookingStatus =
      typeof item.bookingStatus === 'string' && BOOKING_STATUS_VALUES.has(item.bookingStatus as BookingStatus)
        ? item.bookingStatus as BookingStatus
        : priority === 'nice-to-have'
          ? 'idea'
          : 'needs-confirmation'
    result.push({
      title,
      type: inferMustDoType(title, item.type),
      timing,
      date: timing === 'specific-date' ? asString(item.date) || undefined : undefined,
      required: priority === 'required',
      priority,
      bookingStatus,
      logistics: asString(item.logistics) || undefined,
      location: asString(item.location) || undefined,
      duration: asString(item.duration) || undefined,
      why: asString(item.why) || undefined,
    })
  }
  return result.slice(0, 12)
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

  const rawContext = asString(input.rawContext) || asString(input.brief)
  const sourceText = asString(input.sourceText)
  const brief = asString(input.brief) || rawContext
  const destination = asString(input.destination) || asString(input.locationText) || asString(input.stayName) || asString(input.venueName)
  const planType = inferPlanType({
    planType: input.planType,
    template: input.template,
    name: asString(input.name),
    destination,
    brief,
    sourceText,
  })
  const name = inferName(asString(input.name), destination, planType)
  const startDate = asString(input.startDate)
  const endDate = asString(input.endDate)
  const rawSlug = asString(input.slug)
  const slug = slugifyTripSlug(rawSlug || name)
  const errors: { path: string; message: string }[] = []

  if (!name) errors.push({ path: 'name', message: 'Trip name is required.' })
  if (!destination) errors.push({ path: 'destination', message: 'Destination, stay, venue, or location is required.' })
  if (!isIsoDate(startDate)) errors.push({ path: 'startDate', message: 'Start date must be a valid date.' })
  if (!isIsoDate(endDate)) errors.push({ path: 'endDate', message: 'End date must be a valid date.' })
  if (startDate && endDate && startDate > endDate) errors.push({ path: 'dates', message: 'End date must be after start date.' })
  if (!isValidTripSlug(slug)) errors.push({ path: 'slug', message: 'Share URL is invalid.' })

  if (errors.length > 0) return { ok: false, validationErrors: errors }

  const travelers = asString(input.travelers)
  const travelerNames = parseTravelers(travelers)
  const vibe = normalizeVibe(input.vibe)
  const template = inferTemplate({ template: input.template, planType, name, destination, brief, vibe })
  const pace = typeof input.pace === 'string' && PACE_VALUES.has(input.pace as TripPace) ? input.pace as TripPace : 'very-loose'
  const planningHelp =
    typeof input.planningHelp === 'string' && PLANNING_HELP_VALUES.has(input.planningHelp as TripPlanningHelp)
      ? input.planningHelp as TripPlanningHelp
      : 'mostly-plan-for-me'
  const pack = findDestinationPack(name, destination, brief)
  const textForSubtype = `${name} ${destination} ${brief} ${sourceText}`
  const eventSubtype = planType === 'event' ? inferEventSubtype(input.eventSubtype, textForSubtype) : undefined
  const confirmedItems = normalizeMustDos(input.confirmedItems).map((item) => ({
    ...item,
    required: true,
    priority: 'required' as MustDoPriority,
    bookingStatus: 'confirmed' as BookingStatus,
  }))
  const niceToHaves = normalizeMustDos(input.niceToHaves).map((item) => ({
    ...item,
    required: false,
    priority: 'nice-to-have' as MustDoPriority,
    bookingStatus: 'idea' as BookingStatus,
  }))

  return {
    ok: true,
    brief: {
      slug,
      name,
      destination,
      locationText: asString(input.locationText) || destination,
      planType,
      eventSubtype,
      startDate,
      endDate,
      template,
      travelers,
      travelerNames,
      guestCount: asString(input.guestCount),
      kidsAndAges: asString(input.kidsAndAges),
      mobilityNotes: asString(input.mobilityNotes),
      foodPreferences: asString(input.foodPreferences),
      budgetStyle: asString(input.budgetStyle),
      arrivalWindow: asString(input.arrivalWindow),
      departureWindow: asString(input.departureWindow),
      stayName: asString(input.stayName) || (planType === 'event' ? asString(input.venueName) : pack?.name) || destination,
      stayAddress: asString(input.stayAddress) || pack?.address || destination,
      venueName: asString(input.venueName) || (planType === 'event' ? destination : ''),
      venueAddress: asString(input.venueAddress) || (planType === 'event' ? destination : ''),
      createdBy: asString(input.createdBy),
      brief,
      rawContext,
      sourceText,
      links: asStringArray(input.links),
      vibe,
      pace,
      planningHelp,
      mustDos: normalizeMustDos(input.mustDos),
      niceToHaves,
      confirmedItems,
      followUpAnswers: asStringArray(input.followUpAnswers),
    },
  }
}

export const normalizePlanBrief = normalizeTripGenerationBrief

function draftStrengthFromScore(score: number): DraftStrength {
  if (score >= 8) return 'strong'
  if (score >= 5) return 'medium'
  return 'weak'
}

function question(id: string, questionText: string, reason: string): BriefQuestion {
  return { id, question: questionText, reason }
}

export function scorePlanBrief(input: NormalizedTripGenerationBrief): BriefQuality {
  const missingInputs: string[] = []
  const questions: BriefQuestion[] = []
  let score = 0

  if (input.destination) score += 1
  if (input.startDate && input.endDate) score += 1
  if (input.rawContext.length >= 80 || input.brief.length >= 80) score += 2
  else {
    missingInputs.push('rich context')
    questions.push(question('context', 'What should this plan know that a normal form would miss?', 'Richer context makes the itinerary and tasks much less generic.'))
  }

  const hasPeople = input.travelerNames.length > 0 || Boolean(input.guestCount)
  if (hasPeople) score += 1
  else {
    missingInputs.push(input.planType === 'event' ? 'guest count or groups' : 'travelers')
    questions.push(question('people', input.planType === 'event' ? 'Who is coming, and roughly how many people?' : 'Who is going, and are there kids or mobility needs?', 'People context changes pacing, food, packing, and task assignments.'))
  }

  const hasAnchor = input.planType === 'event'
    ? Boolean(input.venueName || input.venueAddress)
    : Boolean(input.stayName || input.stayAddress)
  if (hasAnchor) score += 1
  else {
    missingInputs.push(input.planType === 'event' ? 'venue' : 'stay or lodging')
    questions.push(question('anchor', input.planType === 'event' ? 'Where is the event happening?' : 'Where are you staying, or what area should the plan be built around?', 'The planner needs an anchor before it can make useful location and timing choices.'))
  }

  if (input.arrivalWindow || input.departureWindow) score += 1
  else {
    missingInputs.push('arrival/departure timing')
    questions.push(question('timing', input.planType === 'event' ? 'What time should setup start and when does the event end?' : 'When do you arrive and leave?', 'Arrival and departure timing keeps the first and last day realistic.'))
  }

  if (input.mustDos.length > 0 || input.confirmedItems.length > 0) score += 2
  else {
    missingInputs.push(input.planType === 'event' ? 'must-have event moments' : 'must-dos')
    questions.push(question('must-dos', input.planType === 'event' ? 'What absolutely needs to happen at this event?' : 'What are the top things you definitely want to do?', 'Priority anchors should drive the schedule, checklist, bookings, and budget.'))
  }

  if (input.foodPreferences) score += 1
  else if (input.planType === 'event') {
    missingInputs.push('food preferences')
    questions.push(question('food', 'What food and drinks should be planned?', 'Food planning is usually the biggest event-task driver.'))
  }

  if (input.budgetStyle) score += 1
  if (input.kidsAndAges || input.mobilityNotes) score += 1
  if (input.followUpAnswers.length > 0) score += 1

  const draftStrength = draftStrengthFromScore(score)
  const warnings =
    draftStrength === 'weak'
      ? ['This draft is a starter. Add lodging, timing, people, must-dos, or food/activity preferences to make it much stronger.']
      : draftStrength === 'medium'
        ? ['This is a useful first draft, but a few logistics still need confirmation before relying on exact timing.']
        : ['This brief has enough context for a strong editable first draft.']

  return {
    score,
    draftStrength,
    missingInputs,
    warnings,
    questions: questions.slice(0, 6),
  }
}

function sourceIdFromUrl(url: string): string {
  return makeStableIdFromLabel('src', url.replace(/^https?:\/\//, ''), [])
}

function packSourceRefs(pack?: DestinationPack): PlannerSourceRef[] {
  if (!pack) return []
  return pack.sourceUrls.slice(0, 10).map((url) => ({
    id: sourceIdFromUrl(url),
    title: pack.name,
    url,
    kind: 'official',
    note: 'Curated destination-pack source.',
  }))
}

function inferredSourceRef(input: NormalizedTripGenerationBrief): PlannerSourceRef {
  return {
    id: 'src-user-brief',
    title: 'User planning brief',
    kind: 'user-provided',
    note: input.rawContext || input.brief || 'Details entered in the planner wizard.',
  }
}

function mergeSourceRefs(sourceRefs: PlannerSourceRef[]): PlannerSourceRef[] {
  const seen = new Set<string>()
  const result: PlannerSourceRef[] = []
  for (const source of sourceRefs) {
    const key = source.url || source.id
    if (seen.has(key) || seen.has(source.id)) continue
    seen.add(key)
    seen.add(source.id)
    result.push(source)
  }
  return result.slice(0, 20)
}

function buildBaseResearch(input: NormalizedTripGenerationBrief, pack?: DestinationPack): ResearchBundle {
  const sourceRefs = mergeSourceRefs([inferredSourceRef(input), ...packSourceRefs(pack)])
  return {
    sourceRefs,
    insights: [
      input.planType === 'event'
        ? 'Use the user brief as the source of truth for guest, food, setup, and run-of-show priorities.'
        : 'Use the stay/destination as the schedule anchor and keep exact bookings marked for confirmation.',
      ...(pack?.planningNotes ?? []),
    ],
    notes: pack ? [`Curated pack matched: ${pack.name}.`] : ['No curated destination pack matched; use conservative inferred planning.'],
    usedSearch: false,
  }
}

function mergeResearch(base: ResearchBundle, extra?: ResearchBundle | null): ResearchBundle {
  if (!extra) return base
  return {
    sourceRefs: mergeSourceRefs([...base.sourceRefs, ...extra.sourceRefs]),
    insights: [...base.insights, ...extra.insights].filter(Boolean).slice(0, 20),
    notes: [...base.notes, ...extra.notes].filter(Boolean).slice(0, 20),
    usedSearch: base.usedSearch || extra.usedSearch,
  }
}

function itemStatusFromBookingStatus(status?: BookingStatus): PlanItemStatus {
  if (status === 'confirmed') return 'confirmed'
  if (status === 'needs-booking') return 'needs-booking'
  if (status === 'idea') return 'suggested'
  return 'needs-confirmation'
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

function packRestaurantActivity(item: DestinationPackItem, ids: string[], sourceRefs: PlannerSourceRef[]): Activity {
  const source = item.url ? sourceRefs.find((ref) => ref.url === item.url) : undefined
  return {
    id: nextId('td', item.name, ids),
    name: item.name,
    category: item.category,
    address: item.address,
    url: item.url,
    notes: itemNotes(item.notes, item.bookingNote ? `Next step: ${item.bookingNote}` : undefined),
    status: item.bookingNote ? 'needs-confirmation' : 'suggested',
    why: 'Matched from curated or source-backed destination context.',
    nextStep: item.bookingNote ?? 'Confirm current hours and fit before relying on this idea.',
    sourceIds: source ? [source.id] : undefined,
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
    address: mustDo.location,
    url: lower.includes('lovers')
      ? 'https://maps.google.com/?q=Lovers+Beach+Cabo+San+Lucas'
      : lower.includes('golf')
        ? 'https://maps.google.com/?q=golf+Los+Cabos'
        : undefined,
    notes: itemNotes(notes, mustDo.logistics, mustDo.duration ? `Plan for ${mustDo.duration}.` : undefined),
    status: itemStatusFromBookingStatus(mustDo.bookingStatus),
    why: mustDo.why ?? 'Priority anchor from the planning brief.',
    nextStep: mustDo.bookingStatus === 'confirmed'
      ? 'Add confirmation/time details if they are not already in the trip.'
      : 'Choose provider/time and confirm logistics before relying on this plan.',
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
      title: input.planType === 'event' ? 'Confirm venue, setup access, and event timing' : 'Confirm stay, check-in, and room details',
      category: 'Stay',
      done: false,
      status: 'needs-confirmation',
      why: 'The plan needs a reliable home base before timing can be trusted.',
    },
    {
      id: nextId('ck', 'confirm flights and transportation', ids),
      title: 'Confirm flights and airport transportation',
      category: 'Travel',
      done: false,
      status: 'needs-confirmation',
    },
    {
      id: nextId('ck', 'reserve priority dinners', ids),
      title: 'Reserve priority resort dinners',
      category: 'Dining',
      done: false,
      notes: pack ? 'Ask Le Blanc concierge or use the app to confirm reservation windows and dress codes.' : undefined,
      status: 'needs-booking',
    },
    {
      id: nextId('ck', 'confirm passports ids', ids),
      title: 'Confirm passports / IDs and travel documents',
      category: 'Travel docs',
      done: false,
      status: 'needs-confirmation',
    },
    {
      id: nextId('ck', 'share trip link', ids),
      title: 'Share the trip link',
      category: 'Admin',
      done: false,
      status: 'suggested',
    },
  ]

  for (const mustDo of [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves]) {
    items.push({
      id: nextId('ck', mustDo.title, ids),
      title: mustDo.bookingStatus === 'confirmed' ? `Add final details for ${mustDo.title}` : `${mustDo.required ? 'Book / confirm' : 'Consider'} ${mustDo.title}`,
      category: mustDo.type === 'dining' ? 'Dining' : 'Activities',
      done: false,
      notes: mustDo.date ? `Preferred date: ${mustDo.date}` : 'Generated from the must-do list.',
      status: itemStatusFromBookingStatus(mustDo.bookingStatus),
      why: mustDo.required ? 'Required planning anchor.' : 'Nice-to-have option from the brief.',
      nextStep: mustDo.bookingStatus === 'confirmed' ? 'Add time, address, and confirmation details.' : 'Confirm provider, time, cost, and transportation.',
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
  const text = `${input.brief} ${input.rawContext} ${[...input.mustDos, ...input.confirmedItems, ...input.niceToHaves].map((item) => item.title).join(' ')}`.toLowerCase()
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
  if (input.kidsAndAges) {
    items.push({ id: nextId('pk', 'kid gear', ids), title: 'Kid-specific clothes, snacks, and comfort items', category: 'Kids', notes: input.kidsAndAges })
  }
  if (input.mobilityNotes) {
    items.push({ id: nextId('pk', 'mobility comfort', ids), title: 'Mobility or comfort items', category: 'Accessibility', notes: input.mobilityNotes })
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
  for (const mustDo of [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves]) {
    items.push({
      id: nextId('b', mustDo.title, ids),
      name: mustDo.title,
      total: 0,
      splitCount: Math.max(1, input.travelerNames.length || 1),
      status: mustDo.bookingStatus === 'confirmed' ? 'estimate' : 'tbd',
      notes: mustDo.bookingStatus === 'confirmed' ? 'Add actual cost if it needs to be tracked.' : 'Update after booking or confirming price.',
      why: mustDo.required ? 'Budget placeholder for a priority anchor.' : 'Optional budget placeholder.',
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
      status: input.stayName && input.stayName !== 'Stay TBD' ? 'needs-confirmation' : 'needs-booking',
      why: 'This anchors the whole schedule.',
      nextStep: 'Add confirmation number, check-in time, address, and booking link when available.',
    },
    {
      id: nextId('bk', 'airport transportation', ids),
      kind: 'car',
      title: 'Airport transportation',
      when: input.startDate,
      details: 'Confirm airport pickup/dropoff, driver contact, and timing.',
      status: 'needs-confirmation',
      why: 'Travel buffers keep arrival and departure days realistic.',
      nextStep: 'Confirm pickup/dropoff times after flights are known.',
    },
  ]

  for (const mustDo of [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves]) {
    bookings.push({
      id: nextId('bk', mustDo.title, ids),
      kind: mustDoBookingKind(mustDo.type),
      title: mustDo.title,
      when: mustDo.date,
      details: 'Generated from the must-do list. Confirm time, provider, cost, transportation, and cancellation details.',
      status: itemStatusFromBookingStatus(mustDo.bookingStatus),
      why: mustDo.required ? 'Priority anchor from the brief.' : 'Optional idea from the brief.',
      nextStep: mustDo.bookingStatus === 'confirmed' ? 'Add exact time, address, and confirmation details.' : 'Book or confirm provider, timing, cost, and transportation.',
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
      status: 'needs-booking',
      why: 'Best-fit special dinner from the Le Blanc pack.',
      nextStep: 'Ask concierge about availability and dress code.',
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

  for (const item of [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves]) {
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
          time: input.arrivalWindow || 'Arrival',
          title: 'Arrive, check in, and settle into the resort',
          notes: 'Keep the first day intentionally light. Add flight and transfer times once confirmed.',
          address: pack?.address ?? input.destination,
          status: 'needs-confirmation',
          why: 'Arrival days need buffer so the plan does not start too aggressively.',
          nextStep: 'Add flight and transfer times once confirmed.',
        },
        {
          time: 'Evening',
          title: dinner ? `Easy dinner at ${dinner.name}` : 'Easy arrival dinner',
          notes: dinner ? `${dinner.notes} Confirm reservation needs before relying on this.` : 'Choose something low-effort after travel.',
          link: dinner?.url,
          status: dinner ? 'needs-confirmation' : 'suggested',
          why: 'Arrival night should be easy and low-friction.',
          nextStep: dinner?.bookingNote ?? 'Choose an easy dinner once arrival time is known.',
        },
      )
    } else if (isLast) {
      items.push(
        {
          time: 'Morning',
          title: 'Slow breakfast and pack up',
          notes: 'Use this as the checkout buffer. Confirm checkout time with the resort.',
          status: 'suggested',
          why: 'Departure day should stay light.',
        },
        {
          time: input.departureWindow || 'Departure',
          title: 'Checkout and airport transfer',
          notes: 'Add pickup time, flight time, and driver details once confirmed.',
          status: 'needs-confirmation',
          nextStep: 'Add pickup time, flight time, and driver details.',
        },
      )
    } else {
      items.push({
        time: 'Morning',
        title: index === 1 && spa ? `${spa.name} or slow resort morning` : 'Slow resort morning',
        notes: index === 1 && spa ? spa.notes : 'Keep the morning flexible for breakfast, pool, and recovery.',
        link: index === 1 ? spa?.url : undefined,
        status: 'suggested',
        why: input.pace === 'very-loose' ? 'The brief asked for breathing room.' : 'A morning anchor keeps the day readable.',
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
          mustDo.logistics,
        ),
        address: mustDo.location,
        status: itemStatusFromBookingStatus(mustDo.bookingStatus),
        why: mustDo.why ?? (mustDo.required ? 'Required must-do from the brief.' : 'Optional idea from the brief.'),
        nextStep: mustDo.bookingStatus === 'confirmed' ? 'Add exact time and confirmation details.' : 'Confirm provider, time, cost, transportation, and cancellation rules.',
      })
    }

    if (!isFirst && !isLast) {
      items.push({
        time: 'Late afternoon',
        title: pool?.name ?? 'Pool, beach, or room reset',
        notes: pool?.notes ?? 'Leave open space before dinner.',
        status: 'suggested',
        why: 'This keeps the day from becoming a checklist.',
      })
      items.push({
        time: 'Dinner',
        title: dinner ? `Dinner at ${dinner.name}` : 'Dinner reservation',
        notes: dinner ? `${dinner.notes} Confirm reservation and dress code.` : 'Pick a dinner spot and add reservation details.',
        link: dinner?.url,
        status: dinner ? 'needs-confirmation' : 'needs-booking',
        why: dinner ? 'Dinner option matched from destination context.' : 'The evening needs a placeholder until dinner is chosen.',
        nextStep: dinner?.bookingNote ?? 'Choose dinner and add reservation details.',
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

function makeEventItinerary(input: NormalizedTripGenerationBrief): Day[] {
  const date = input.startDate
  const setupTime = input.arrivalWindow || 'Setup'
  const endTime = input.departureWindow || 'Wrap-up'
  const anchorItems = [...input.confirmedItems, ...input.mustDos]
  const items: Day['items'] = [
    {
      time: setupTime,
      title: 'Setup and host reset',
      notes: itemNotes('Set up food, seating, supplies, signs, games, and any weather backup.', input.mobilityNotes ? `Accessibility note: ${input.mobilityNotes}` : undefined),
      address: input.venueAddress || input.destination,
      status: 'needs-confirmation',
      why: 'A clean setup block keeps the event from starting in a scramble.',
      nextStep: 'Confirm who has access and what needs to be ready first.',
    },
    {
      time: 'Start',
      title: input.eventSubtype === 'game-night' ? 'Guests arrive and games open' : 'Guests arrive',
      notes: itemNotes('Keep the first part easy so people can settle in.', input.foodPreferences ? `Food note: ${input.foodPreferences}` : undefined),
      status: 'suggested',
      why: 'The start needs a simple landing moment.',
    },
    ...anchorItems.map((mustDo) => ({
      time: mustDo.timing === 'first-day' ? 'Early event' : mustDo.timing === 'last-full-day' ? 'Finale' : 'Main block',
      title: mustDo.title,
      notes: itemNotes('Priority event moment from the brief.', mustDo.logistics, mustDo.duration ? `Plan for ${mustDo.duration}.` : undefined),
      address: mustDo.location,
      status: itemStatusFromBookingStatus(mustDo.bookingStatus),
      why: mustDo.why ?? 'This was called out as important.',
      nextStep: mustDo.bookingStatus === 'confirmed' ? 'Add exact timing or owner if needed.' : 'Assign owner and confirm supplies/logistics.',
    })),
    {
      time: endTime,
      title: 'Cleanup and handoff',
      notes: 'Collect supplies, reset the space, handle trash, and send any follow-up message.',
      status: 'suggested',
      why: 'Cleanup is part of the plan, not an afterthought.',
      nextStep: 'Assign cleanup owners before the event.',
    },
  ]

  return [{
    date,
    title: input.eventSubtype ? `${input.eventSubtype.replace(/-/g, ' ')} run-of-show` : 'Event run-of-show',
    items,
  }]
}

function makeEventTasks(input: NormalizedTripGenerationBrief): ChecklistItem[] {
  const ids: string[] = []
  const tasks: ChecklistItem[] = [
    { id: nextId('et', 'confirm guest count', ids), title: 'Confirm guest count and key people', category: 'Guests', done: false, status: 'needs-confirmation' },
    { id: nextId('et', 'confirm venue access', ids), title: 'Confirm venue access, setup time, and cleanup rules', category: 'Venue', done: false, status: 'needs-confirmation' },
    { id: nextId('et', 'food drinks plan', ids), title: 'Lock food and drink plan', category: 'Food', done: false, notes: input.foodPreferences || undefined, status: 'needs-confirmation' },
    { id: nextId('et', 'setup owner', ids), title: 'Assign setup and cleanup owners', category: 'Assignments', done: false, status: 'needs-confirmation' },
    { id: nextId('et', 'share event plan', ids), title: 'Share the event plan with helpers', category: 'Admin', done: false, status: 'suggested' },
  ]

  for (const mustDo of [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves]) {
    tasks.push({
      id: nextId('et', mustDo.title, ids),
      title: mustDo.bookingStatus === 'confirmed' ? `Confirm details for ${mustDo.title}` : `Plan ${mustDo.title}`,
      category: mustDo.type === 'dining' ? 'Food' : 'Activities',
      done: false,
      notes: mustDo.logistics || mustDo.why,
      status: itemStatusFromBookingStatus(mustDo.bookingStatus),
      nextStep: 'Assign an owner and timing.',
    })
  }

  return tasks
}

function makeEventSupplies(input: NormalizedTripGenerationBrief): PackingItem[] {
  const ids: string[] = []
  const supplies: PackingItem[] = [
    { id: nextId('sup', 'plates napkins cups', ids), title: 'Plates, napkins, cups, and utensils', category: 'Food service', status: 'needs-confirmation' },
    { id: nextId('sup', 'ice cooler drinks', ids), title: 'Ice, cooler, and drink setup', category: 'Drinks', status: 'needs-confirmation' },
    { id: nextId('sup', 'trash cleanup', ids), title: 'Trash bags and cleanup supplies', category: 'Cleanup', status: 'suggested' },
    { id: nextId('sup', 'seating setup', ids), title: 'Seating, shade, or room setup', category: 'Setup', notes: input.mobilityNotes || undefined, status: 'needs-confirmation' },
  ]

  if (input.eventSubtype === 'game-night') {
    supplies.push({ id: nextId('sup', 'games score', ids), title: 'Games, score sheets, chargers, and table space', category: 'Games', status: 'needs-confirmation' })
  }
  if (input.eventSubtype === 'youth-sports' || input.eventSubtype === 'pro-sports') {
    supplies.push({ id: nextId('sup', 'sports tickets gear', ids), title: 'Tickets, uniforms, chairs, sunscreen, and water', category: 'Sports', status: 'needs-confirmation' })
  }
  if (input.kidsAndAges) {
    supplies.push({ id: nextId('sup', 'kid supplies', ids), title: 'Kid-friendly snacks, activities, and comfort items', category: 'Kids', notes: input.kidsAndAges, status: 'suggested' })
  }

  return supplies
}

function makeEventFood(input: NormalizedTripGenerationBrief): Trip['food'] {
  const ids: string[] = []
  const food: NonNullable<Trip['food']> = [
    {
      id: nextId('food', 'main food plan', ids),
      title: input.foodPreferences || 'Main food plan',
      category: 'Food',
      quantity: input.guestCount || undefined,
      notes: 'Confirm menu, dietary needs, serving setup, and who is bringing what.',
    },
    {
      id: nextId('food', 'drinks ice', ids),
      title: 'Drinks and ice',
      category: 'Drinks',
      quantity: input.guestCount || undefined,
      notes: 'Add water, non-alcoholic options, coolers, and ice.',
    },
  ]

  for (const item of input.mustDos.filter((mustDo) => mustDo.type === 'dining')) {
    food.push({
      id: nextId('food', item.title, ids),
      title: item.title,
      category: 'Special food',
      notes: item.logistics || item.why,
    })
  }

  return food
}

function makeCopyBlocks(input: NormalizedTripGenerationBrief, summary: TripGenerationSummary): CopyBlock[] {
  const firstNames = input.travelerNames.length ? input.travelerNames.join(' + ') : input.name
  return [
    {
      id: input.planType === 'event' ? 'msg-event-link' : 'msg-trip-link',
      title: input.planType === 'event' ? 'Event plan message' : 'Trip link message',
      body: input.planType === 'event'
        ? `Here is the ${firstNames} event plan. It has the run-of-show, food, supplies, setup, cleanup, tasks, budget placeholders, and notes. A few details still need confirmation before we rely on exact timing.`
        : `Here is the ${firstNames} trip plan. It has the loose schedule, dinner ideas, must-do activities, checklist, packing, and notes. A few reservations still need to be confirmed before we rely on the exact details.`,
      status: 'suggested',
    },
    {
      id: 'msg-confirmation-list',
      title: 'Confirmation list',
      body: summary.needsConfirmation.map((item) => `- ${item}`).join('\n'),
      status: 'needs-confirmation',
    },
    {
      id: 'msg-source-notes',
      title: 'Source notes',
      body: summary.sourceRefs.length
        ? summary.sourceRefs.map((source) => `- ${source.title}${source.url ? `: ${source.url}` : ''}`).join('\n')
        : 'This draft used the planning brief and deterministic fallback rules. Confirm details before booking.',
      status: summary.sourceRefs.length ? 'suggested' : 'needs-confirmation',
    },
  ]
}

function makeSummary(
  input: NormalizedTripGenerationBrief,
  pack: DestinationPack | undefined,
  quality: BriefQuality,
  research: ResearchBundle,
  source: TripGenerationSource = 'deterministic',
): TripGenerationSummary {
  const mustDoConfirmations = [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves].map((item) => `Confirm ${item.title}`)
  const needsConfirmation = [
    input.planType === 'event' ? 'Confirm venue access, setup time, and cleanup rules' : 'Confirm flights and airport transportation',
    input.planType === 'event' ? 'Confirm guest count and food/drink plan' : 'Confirm stay confirmation number and exact check-in/check-out times',
    input.planType === 'event' ? 'Confirm assignments for setup, food, and cleanup' : 'Confirm dinner reservations, dress codes, and current menus',
    ...mustDoConfirmations,
  ]
  if (pack?.id === 'le-blanc-los-cabos') {
    needsConfirmation.push('Ask Le Blanc concierge about current Blanc Experiences, spa availability, and activity logistics')
  }

  return {
    source,
    matchedPackId: pack?.id,
    matchedPackName: pack?.name,
    draftStrength: quality.draftStrength,
    notes: [
      source === 'ai' ? 'AI generated the first draft using the curated destination pack as context.' : 'Deterministic smart draft generated from the trip brief.',
      research.usedSearch ? 'Live web research was used and source notes were captured for review.' : 'No live search was used for this draft.',
      ...quality.warnings,
      ...research.notes,
      ...(pack?.planningNotes ?? []),
    ],
    needsConfirmation,
    missingInputs: quality.missingInputs,
    questions: quality.questions,
    sourceRefs: research.sourceRefs,
  }
}

export function buildDeterministicTrip(
  input: NormalizedTripGenerationBrief,
  options: { research?: ResearchBundle; quality?: BriefQuality; source?: TripGenerationSource } = {},
): TripGenerationResult {
  const pack = findDestinationPack(input.name, input.destination, input.brief)
  const quality = options.quality ?? scorePlanBrief(input)
  const research = options.research ?? buildBaseResearch(input, pack)
  const base = createTripShell({
    slug: input.slug,
    name: input.name,
    location: pack?.name ?? input.destination,
    startDate: input.startDate,
    endDate: input.endDate,
    template: input.template,
    travelers: input.travelers,
    stayName: input.planType === 'event' ? input.venueName || input.stayName : input.stayName,
    createdBy: input.createdBy,
  })
  const summary = makeSummary(input, pack, quality, research, options.source ?? 'deterministic')
  const activityIds: string[] = []
  const thingsToDo: Activity[] = [
    ...(input.planType === 'event' ? [] : pack?.restaurants.map((item) => packRestaurantActivity(item, activityIds, research.sourceRefs)) ?? []),
    ...(input.planType === 'event' ? [] : pack?.activities.map((item) => packRestaurantActivity(item, activityIds, research.sourceRefs)) ?? []),
  ]
  for (const mustDo of [...input.confirmedItems, ...input.mustDos, ...input.niceToHaves]) thingsToDo.push(mapMustDoToActivity(mustDo, activityIds))

  const contactIds: string[] = []
  const contacts: Contact[] = [
    ...(pack?.contacts.map((item) => makeContactFromPack(item, contactIds)) ?? []),
    { id: nextId('c', 'emergency', contactIds), label: 'Emergency', value: '911', kind: 'phone' },
  ]

  const trip: Trip = {
    ...base,
    kind: input.planType === 'event' ? 'event' : undefined,
    location: pack?.name ?? input.destination,
    tagline: input.planType === 'event'
      ? 'A shared event command center with the run-of-show, supplies, food, tasks, and follow-ups'
      : input.template === 'honeymoon'
      ? 'A loose honeymoon plan with room for the resort, romance, and a few can-not-miss moments'
      : 'A smart first draft ready for quick edits',
    stay: {
      ...base.stay,
      name: input.planType === 'event' ? input.venueName || input.stayName : input.stayName,
      address: input.planType === 'event' ? input.venueAddress || input.destination : input.stayAddress || pack?.address || input.destination,
      hostPhone: pack?.phone,
      amenities: [
        ...(input.planType === 'event'
          ? ['Add venue access, supplies, food setup, and cleanup notes from the manage page.']
          : pack
            ? ['Butler service / resort concierge', 'Fine dining', 'Spa and wellness', 'Pool and beach downtime']
            : base.stay.amenities),
      ],
      notes: itemNotes(
        'Generated smart draft. Confirm reservation numbers, exact times, and availability before relying on the details.',
        pack ? `Destination pack matched: ${pack.name}.` : undefined,
        input.planType === 'event' ? 'Event mode uses this section for venue/location details.' : undefined,
      ),
    },
    bookings: input.planType === 'event' ? [] : makeBookings(input, pack),
    itinerary: input.planType === 'event' ? makeEventItinerary(input) : makeItinerary(input, pack),
    thingsToDo,
    people: input.travelerNames.length ? makePeople(input.travelerNames) : base.people,
    contacts,
    checklist: input.planType === 'event' ? [] : makeChecklist(input, pack),
    packing: input.planType === 'event' ? [] : makePacking(input),
    eventTasks: input.planType === 'event' ? makeEventTasks(input) : undefined,
    supplies: input.planType === 'event' ? makeEventSupplies(input) : undefined,
    food: input.planType === 'event' ? makeEventFood(input) : undefined,
    copyBlocks: makeCopyBlocks(input, summary),
    budget: input.planType === 'event'
      ? [
          { id: 'b-food-drinks', name: 'Food and drinks', total: 0, splitCount: 1, status: 'tbd', notes: input.foodPreferences || 'Add estimate after menu is chosen.' },
          { id: 'b-supplies', name: 'Supplies and setup', total: 0, splitCount: 1, status: 'tbd', notes: 'Add supplies, decor, games, rentals, or cleanup costs.' },
        ]
      : makeBudget(input),
    planner: {
      draftStrength: summary.draftStrength,
      warnings: quality.warnings,
      missingInputs: quality.missingInputs,
      generatedAt: new Date().toISOString(),
      sourceMode: research.usedSearch ? 'search' : pack ? 'curated' : 'deterministic',
      sourceRefs: research.sourceRefs,
      questions: quality.questions.map((item) => item.question),
      notes: summary.notes,
    },
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
    kind: candidate.kind === 'event' || candidate.kind === 'trip' ? candidate.kind : fallback.kind,
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
    food: Array.isArray(candidate.food) ? candidate.food : fallback.food,
    supplies: Array.isArray(candidate.supplies) ? candidate.supplies : fallback.supplies,
    eventTasks: Array.isArray(candidate.eventTasks) ? candidate.eventTasks : fallback.eventTasks,
    planner: candidate.planner ?? fallback.planner,
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

function markAiFallback(fallback: TripGenerationResult): TripGenerationResult {
  const note = 'AI planner did not return valid output; deterministic fallback was used.'
  return {
    trip: {
      ...fallback.trip,
      planner: fallback.trip.planner
        ? {
            ...fallback.trip.planner,
            sourceMode: 'ai-fallback',
            notes: fallback.trip.planner.notes?.includes(note)
              ? fallback.trip.planner.notes
              : [...(fallback.trip.planner.notes ?? []), note],
          }
        : fallback.trip.planner,
    },
    generationSummary: {
      ...fallback.generationSummary,
      source: 'ai-fallback',
      notes: fallback.generationSummary.notes.includes(note)
        ? fallback.generationSummary.notes
        : [...fallback.generationSummary.notes, note],
    },
  }
}

export async function generateSmartTrip(
  input: NormalizedTripGenerationBrief,
  options: { aiPlanner?: TripAiPlanner; researcher?: TripResearcher } = {},
): Promise<TripGenerationResult> {
  const pack = findDestinationPack(input.name, input.destination, input.brief)
  const quality = scorePlanBrief(input)
  const baseResearch = buildBaseResearch(input, pack)
  let research = baseResearch
  if (options.researcher) {
    try {
      research = mergeResearch(baseResearch, await options.researcher(input, quality))
    } catch {
      research = baseResearch
    }
  }
  const fallback = buildDeterministicTrip(input, { quality, research })
  if (!options.aiPlanner) return fallback

  try {
    const aiTrip = await options.aiPlanner(input, {
      destinationPack: pack,
      fallbackTrip: fallback.trip,
      fallbackSummary: fallback.generationSummary,
      research,
    })
    if (!aiTrip) return markAiFallback(fallback)
    const candidate = normalizeAiTrip(stripNulls(aiTrip) as Trip, fallback.trip)
    const validationErrors = validateTripForSave(candidate)
    if (
      validationErrors.length > 0 ||
      !itineraryMatchesFallbackDates(candidate, fallback.trip) ||
      !includesRequiredMustDos(candidate, input.mustDos)
    ) {
      return markAiFallback(fallback)
    }
    return {
      trip: {
        ...candidate,
        planner: {
          ...(candidate.planner ?? fallback.trip.planner),
          draftStrength: quality.draftStrength,
          warnings: quality.warnings,
          missingInputs: quality.missingInputs,
          generatedAt: candidate.planner?.generatedAt ?? new Date().toISOString(),
          sourceMode: research.usedSearch ? 'search' : 'ai',
          sourceRefs: research.sourceRefs,
          questions: quality.questions.map((item) => item.question),
        },
      },
      generationSummary: makeSummary(input, pack, quality, research, 'ai'),
    }
  } catch {
    return markAiFallback(fallback)
  }
}
