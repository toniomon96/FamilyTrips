import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createTripShell,
  isValidTripSlug,
  slugifyTripSlug,
  TRIP_TEMPLATE_OPTIONS,
  type TripTemplateId,
} from '../utils/tripShell'
import { todayLocalISO } from '../utils/formatters'
import { findSensitiveContextWarnings } from '../utils/sensitiveContext'
import { dateRangeError, isIsoDate, isValidDateRange } from '../utils/dateValidation'
import type { Trip } from '../types/trip'
import type {
  BriefQuality,
  EventSubtype,
  PlanType,
  TripGenerationSummary,
  TripPace,
  TripPlanningHelp,
  TripMustDoType,
} from '../utils/tripGeneration'

type ApiSuccess =
  | { ok: true; trip: Trip; generationSummary?: TripGenerationSummary }
  | { ok: true; quality: BriefQuality }
  | { ok: true; deleted: true; tripSlug: string }

type ApiFailure = {
  ok: false
  error: string
  validationErrors?: { path: string; message: string }[]
}

type ApiResult = ApiSuccess | ApiFailure
type CreateMode = 'smart' | 'blank'
type WizardStep = 'start' | 'details' | 'questions' | 'review'
type PendingTripAction = 'questions' | 'preview' | 'create' | 'blankCreate'

type SpeechRecognitionResultLike = {
  [index: number]: { transcript: string }
  isFinal: boolean
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop?: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
const CARD_CLASS = 'rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'
const PRIMARY_BUTTON = 'rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300'
const SECONDARY_BUTTON = 'rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800'

const VIBE_OPTIONS = ['relaxed', 'food-focused', 'adventure', 'family', 'celebration', 'beach / resort', 'romantic', 'luxury', 'no early mornings']
const EVENT_SUBTYPES: { id: EventSubtype; label: string }[] = [
  { id: 'birthday', label: 'Birthday' },
  { id: 'gathering', label: 'Gathering' },
  { id: 'game-night', label: 'Game night' },
  { id: 'youth-sports', label: 'Kids sports' },
  { id: 'pro-sports', label: 'Sports outing' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'bachelor-party', label: 'Bachelor party' },
  { id: 'shower', label: 'Shower' },
  { id: 'party', label: 'Party' },
  { id: 'other', label: 'Other' },
]
const PACE_OPTIONS: { id: TripPace; label: string }[] = [
  { id: 'very-loose', label: 'Loose' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'packed', label: 'Packed' },
]
const HELP_OPTIONS: { id: TripPlanningHelp; label: string }[] = [
  { id: 'mostly-plan-for-me', label: 'Mostly plan for me' },
  { id: 'give-me-options', label: 'Give me options' },
  { id: 'start-simple', label: 'Start simple' },
]
const CONTEXT_HINTS = {
  trip: ['Stay/address', 'Flights or drive times', 'Booked plans', 'Must-dos', 'Food preferences', 'Budget/pace', 'Kids or mobility'],
  event: ['Venue/access', 'Guest count', 'Setup timing', 'Food/drinks', 'Must-have moments', 'Helpers', 'Cleanup rules'],
}
const REQUEST_TIMEOUT_MS: Record<PendingTripAction, number> = {
  questions: 25_000,
  preview: 120_000,
  create: 90_000,
  blankCreate: 90_000,
}
const PROGRESS_COPY: Record<PendingTripAction, { title: string; steps: string[]; helper: string }> = {
  questions: {
    title: 'Checking your brief',
    steps: ['Validating the essentials', 'Scoring draft strength', 'Finding the best follow-up questions'],
    helper: 'Nothing is saved here. This should usually take a few seconds.',
  },
  preview: {
    title: 'Building your draft',
    steps: ['Validating the trip details', 'Checking the share URL', 'Researching sources or using trusted packs', 'Building itinerary, bookings, tasks, packing, and budget', 'Preparing the review screen'],
    helper: 'Nothing is saved until you accept the preview. If live research is slow, FamilyTrips falls back instead of hanging.',
  },
  create: {
    title: 'Saving your trip',
    steps: ['Validating the final draft', 'Saving the trip', 'Writing version history', 'Opening the manage workspace'],
    helper: 'A trip is only created after this save succeeds. If the network times out, use the recovery link below to check the share URL.',
  },
  blankCreate: {
    title: 'Creating the blank trip',
    steps: ['Building the trip shell', 'Saving the trip', 'Opening the manage workspace'],
    helper: 'A trip is only created after this save succeeds. If the network times out, use the recovery link below to check the share URL.',
  },
}

async function postTrip(payload: Record<string, unknown>, signal?: AbortSignal): Promise<ApiResult> {
  try {
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
    const body = (await response.json().catch(() => null)) as ApiResult | null
    if (body) return body
    return { ok: false, error: response.ok ? 'Empty response.' : `Trip request failed with status ${response.status}.` }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, error: 'This took longer than expected and timed out. Nothing is saved during questions or preview; if you were saving, check the recovery link below before retrying.' }
    }
    return { ok: false, error: 'Network request failed. Check your connection and try again.' }
  }
}

function splitLines(value: string): string[] {
  return value
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
}

function inferMustDoType(title: string): TripMustDoType {
  if (/dinner|restaurant|lunch|breakfast|food|drink/i.test(title)) return 'dining'
  if (/flight|airport|drive|transport|car/i.test(title)) return 'travel'
  if (/reserve|reservation|book|ticket/i.test(title)) return 'reservation'
  if (/pack|bring|remember/i.test(title)) return 'reminder'
  return 'activity'
}

function parseMustDos(value: string, required = true) {
  return splitLines(value).map((title) => ({
    title,
    required,
    priority: required ? 'required' : 'nice-to-have',
    type: inferMustDoType(title),
    bookingStatus: required ? 'needs-confirmation' : 'idea',
    timing: /arrival|first/i.test(title) ? 'first-day' : /last|final|farewell|lovers/i.test(title) ? 'last-full-day' : 'any',
  }))
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const speechWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

function hasTrip(result: ApiResult): result is Extract<ApiSuccess, { trip: Trip }> {
  return result.ok && 'trip' in result
}

function hasQuality(result: ApiResult): result is Extract<ApiSuccess, { quality: BriefQuality }> {
  return result.ok && 'quality' in result
}

function sourceModeLabel(mode?: string): string {
  if (mode === 'search') return 'Researched with sources'
  if (mode === 'ai') return 'AI-assisted'
  if (mode === 'ai-fallback') return 'Fallback draft'
  if (mode === 'curated') return 'Curated pack'
  return 'Deterministic fallback'
}

function draftStrengthClass(strength?: string): string {
  if (strength === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (strength === 'weak') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-blue-200 bg-blue-50 text-blue-900'
}

export default function NewTrip() {
  const navigate = useNavigate()
  const today = todayLocalISO()
  const [mode, setMode] = useState<CreateMode>('smart')
  const [step, setStep] = useState<WizardStep>('start')
  const [pin, setPin] = useState(() => window.sessionStorage.getItem('familytrips:owner-pin') ?? '')
  const [planType, setPlanType] = useState<PlanType>('trip')
  const [eventSubtype, setEventSubtype] = useState<EventSubtype>('gathering')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [rawContext, setRawContext] = useState('')
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [slugWasEdited, setSlugWasEdited] = useState(false)
  const [travelers, setTravelers] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [stayName, setStayName] = useState('')
  const [stayAddress, setStayAddress] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [arrivalWindow, setArrivalWindow] = useState('')
  const [departureWindow, setDepartureWindow] = useState('')
  const [foodPreferences, setFoodPreferences] = useState('')
  const [kidsAndAges, setKidsAndAges] = useState('')
  const [mobilityNotes, setMobilityNotes] = useState('')
  const [budgetStyle, setBudgetStyle] = useState('')
  const [mustDos, setMustDos] = useState('')
  const [niceToHaves, setNiceToHaves] = useState('')
  const [confirmedItems, setConfirmedItems] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [template, setTemplate] = useState<TripTemplateId>('general')
  const [vibe, setVibe] = useState<string[]>(['relaxed'])
  const [pace, setPace] = useState<TripPace>('very-loose')
  const [planningHelp, setPlanningHelp] = useState<TripPlanningHelp>('mostly-plan-for-me')
  const [quality, setQuality] = useState<BriefQuality | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [previewTrip, setPreviewTrip] = useState<Trip | null>(null)
  const [generationSummary, setGenerationSummary] = useState<TripGenerationSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ApiFailure['validationErrors']>([])
  const [startAttempted, setStartAttempted] = useState(false)
  const [dateTouched, setDateTouched] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingTripAction | null>(null)
  const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null)
  const [pendingElapsedSeconds, setPendingElapsedSeconds] = useState(0)
  const [recoverySlug, setRecoverySlug] = useState<string | null>(null)

  const suggestedName = useMemo(() => name.trim() || `${destination.trim() || (planType === 'event' ? 'Family event' : 'Family trip')} ${planType === 'event' ? 'plan' : 'trip'}`, [destination, name, planType])
  const suggestedSlug = useMemo(() => slugifyTripSlug(suggestedName), [suggestedName])
  const slug = useMemo(
    () => slugifyTripSlug(slugWasEdited ? customSlug : suggestedSlug),
    [customSlug, slugWasEdited, suggestedSlug],
  )
  const pinError = pin.trim().length > 0 ? null : 'Trip edit PIN is required.'
  const destinationError = destination.trim().length > 0
    ? null
    : `${planType === 'event' ? 'Venue or gathering location' : 'Destination, stay, resort, or city'} is required.`
  const datesError = dateRangeError(startDate, endDate)
  const datesOk = isValidDateRange(startDate, endDate)
  const slugError = isValidTripSlug(slug) ? null : 'Share URL must use letters, numbers, and hyphens only.'
  const startFormErrors = [pinError, destinationError, datesError, slugError].filter(Boolean)
  const canStart = startFormErrors.length === 0 && datesOk && !saving
  const showStartErrors = startAttempted || step !== 'start'
  const showDateError = dateTouched || showStartErrors
  const isEvent = planType === 'event'
  const sensitiveWarnings = useMemo(() => findSensitiveContextWarnings(rawContext), [rawContext])
  const progressCopy = pendingAction ? PROGRESS_COPY[pendingAction] : null
  const progressStepIndex = progressCopy ? Math.min(progressCopy.steps.length - 1, Math.floor(pendingElapsedSeconds / 4)) : 0
  const showSlowHint = pendingElapsedSeconds >= 12

  useEffect(() => {
    if (!pendingAction || !pendingStartedAt) return undefined
    const updateElapsed = () => setPendingElapsedSeconds(Math.floor((Date.now() - pendingStartedAt) / 1000))
    updateElapsed()
    const interval = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(interval)
  }, [pendingAction, pendingStartedAt])

  function handleStartDateChange(value: string) {
    setDateTouched(true)
    setStartDate(value)
    if (isIsoDate(value) && isIsoDate(endDate) && value > endDate) setEndDate(value)
  }

  function handleEndDateChange(value: string) {
    setDateTouched(true)
    setEndDate(value)
  }

  function buildBrief(extraAnswers = answers) {
    const followUpAnswers = Object.values(extraAnswers).map((answer) => answer.trim()).filter(Boolean)
    return {
      slug,
      name: suggestedName,
      destination,
      locationText: destination,
      planType,
      eventSubtype: isEvent ? eventSubtype : undefined,
      startDate,
      endDate,
      template: isEvent ? 'event' : template,
      travelers,
      guestCount,
      kidsAndAges,
      mobilityNotes,
      foodPreferences,
      budgetStyle,
      arrivalWindow,
      departureWindow,
      stayName,
      stayAddress,
      venueName,
      venueAddress,
      createdBy,
      brief: rawContext,
      rawContext,
      sourceText: followUpAnswers.join('\n'),
      vibe,
      pace,
      planningHelp,
      mustDos: parseMustDos(mustDos, true),
      niceToHaves: parseMustDos(niceToHaves, false),
      confirmedItems: parseMustDos(confirmedItems, true).map((item) => ({ ...item, bookingStatus: 'confirmed' })),
      followUpAnswers,
    }
  }

  async function runTripRequest(kind: PendingTripAction, request: (signal: AbortSignal) => Promise<ApiResult>): Promise<ApiResult> {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS[kind])
    setSaving(true)
    setPendingAction(kind)
    setPendingStartedAt(Date.now())
    setPendingElapsedSeconds(0)
    setRecoverySlug(kind === 'create' || kind === 'blankCreate' ? slug : null)
    setMessage(null)
    setValidationErrors([])
    try {
      return await request(controller.signal)
    } finally {
      window.clearTimeout(timeout)
      setSaving(false)
      setPendingAction(null)
      setPendingStartedAt(null)
    }
  }

  async function handleQuestions(nextAnswers = answers) {
    const result = await runTripRequest('questions', (signal) => postTrip({ action: 'briefQuestions', pin, brief: buildBrief(nextAnswers) }, signal))
    if (!result.ok) {
      setMessage(result.error)
      setValidationErrors(result.validationErrors ?? [])
      return false
    }
    if (hasQuality(result)) {
      setQuality(result.quality)
      setStep('questions')
      return true
    }
    return false
  }

  async function handlePreview(nextAnswers = answers) {
    const result = await runTripRequest('preview', (signal) => postTrip({ action: 'preview', pin, brief: buildBrief(nextAnswers) }, signal))
    if (!result.ok) {
      setMessage(result.error)
      setValidationErrors(result.validationErrors ?? [])
      return
    }
    if (hasTrip(result)) {
      setPreviewTrip(result.trip)
      setGenerationSummary(result.generationSummary ?? null)
      setStep('review')
    }
  }

  async function handleBlankCreate() {
    const result = await runTripRequest('blankCreate', (signal) => postTrip({
      action: 'create',
      pin,
      createdBy,
      trip: createTripShell({
        slug,
        name: suggestedName,
        location: destination,
        startDate,
        endDate,
        template: isEvent ? 'event' : template,
        travelers,
        stayName: isEvent ? venueName || destination : stayName || destination,
        createdBy,
      }),
    }, signal))
    if (!result.ok) {
      setMessage(result.error)
      setValidationErrors(result.validationErrors ?? [])
      return
    }
    if (hasTrip(result)) {
      window.sessionStorage.setItem('familytrips:owner-pin', pin.trim())
      window.dispatchEvent(new CustomEvent('familytrips:trip-overrides-changed', { detail: { tripSlug: result.trip.slug } }))
      navigate(`/${result.trip.slug}/manage`)
    }
  }

  async function handleAcceptPreview() {
    if (!previewTrip) return
    const result = await runTripRequest('create', (signal) => postTrip({ action: 'create', pin, createdBy, trip: previewTrip }, signal))
    if (!result.ok) {
      setMessage(result.error)
      setValidationErrors(result.validationErrors ?? [])
      return
    }
    if (hasTrip(result)) {
      window.sessionStorage.setItem('familytrips:owner-pin', pin.trim())
      window.dispatchEvent(new CustomEvent('familytrips:trip-overrides-changed', { detail: { tripSlug: result.trip.slug } }))
      navigate(`/${result.trip.slug}/manage?created=1&draft=generated`)
    }
  }

  function startVoiceCapture() {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setMessage('Voice capture is not supported in this browser. You can still type or paste the plan.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript
      }
      if (transcript.trim()) setRawContext((current) => `${current}${current ? ' ' : ''}${transcript.trim()}`)
    }
    recognition.onerror = () => {
      setListening(false)
      setMessage('Voice capture stopped. You can keep typing the plan.')
    }
    recognition.onend = () => setListening(false)
    setListening(true)
    recognition.start()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStartAttempted(true)
    if (!canStart) {
      setMessage('Fix the highlighted fields before continuing.')
      return
    }
    setMessage(null)
    if (mode === 'blank') {
      void handleBlankCreate()
      return
    }
    if (step === 'start') {
      setStep('details')
      return
    }
    if (step === 'details') {
      void handleQuestions()
      return
    }
    if (step === 'questions') {
      void handlePreview()
      return
    }
    void handleAcceptPreview()
  }

  function switchMode(nextMode: CreateMode) {
    setMode(nextMode)
    setStep('start')
    setStartAttempted(false)
    setDateTouched(false)
    setQuality(null)
    setPreviewTrip(null)
    setGenerationSummary(null)
    setMessage(null)
    setValidationErrors([])
    setRecoverySlug(null)
  }

  const primaryLabel =
    mode === 'blank'
      ? saving ? 'Creating...' : 'Create blank trip'
      : step === 'start'
        ? 'Start planning'
        : step === 'details'
          ? saving ? 'Checking brief...' : 'Get smart questions'
          : step === 'questions'
            ? saving ? 'Building preview...' : 'Build draft preview'
            : saving ? 'Creating...' : 'Accept and create trip'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-12 space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <span aria-hidden>←</span>
          <span>All trips</span>
        </Link>

        <header className="rounded-3xl bg-slate-950 text-white p-5 shadow-sm space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-slate-300">FamilyTrips planner</p>
            <h1 className="text-3xl font-bold leading-tight">Build the plan from real context.</h1>
            <p className="text-sm leading-6 text-slate-300">
              Paste the messy details, add the few logistics that matter, answer quick follow-ups, then review the draft before anything is saved.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
            <button
              type="button"
              aria-pressed={mode === 'smart'}
              onClick={() => switchMode('smart')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'smart' ? 'bg-white text-slate-950' : 'text-white'}`}
            >
              Build my plan
            </button>
            <button
              type="button"
              aria-pressed={mode === 'blank'}
              onClick={() => switchMode('blank')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'blank' ? 'bg-white text-slate-950' : 'text-white'}`}
            >
              Start blank
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" autoComplete="username" value="trip-editor" readOnly tabIndex={-1} className="sr-only" />

          <section className={CARD_CLASS}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
                <h2 className="text-xl font-bold text-slate-950">Start with the essentials</h2>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{step}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Trip edit PIN</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  aria-invalid={showStartErrors && Boolean(pinError)}
                  aria-describedby={showStartErrors && pinError ? 'trip-pin-error' : undefined}
                  className={FIELD_CLASS}
                />
                {showStartErrors && pinError && <p id="trip-pin-error" className="text-xs font-medium text-red-700">{pinError}</p>}
                <p className="text-xs leading-5 text-slate-500">
                  Toni shares this with trusted family and friends so FamilyTrips can save and edit the plan.
                </p>
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:col-span-2">
                <button type="button" aria-pressed={planType === 'trip'} onClick={() => setPlanType('trip')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${planType === 'trip' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>
                  Trip
                </button>
                <button type="button" aria-pressed={planType === 'event'} onClick={() => setPlanType('event')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${planType === 'event' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>
                  Event
                </button>
              </div>
              {isEvent && (
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Event type</span>
                  <select value={eventSubtype} onChange={(event) => setEventSubtype(event.target.value as EventSubtype)} className={FIELD_CLASS}>
                    {EVENT_SUBTYPES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
              )}
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEvent ? 'Venue, address, or gathering location' : 'Destination, stay, resort, or city'}</span>
                <input
                  required
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder={isEvent ? 'Backyard, park, stadium, house, venue...' : 'Le Blanc Los Cabos, Charleston, lake house...'}
                  aria-invalid={showStartErrors && Boolean(destinationError)}
                  aria-describedby={showStartErrors && destinationError ? 'trip-destination-error' : undefined}
                  className={FIELD_CLASS}
                />
                {showStartErrors && destinationError && <p id="trip-destination-error" className="text-xs font-medium text-red-700">{destinationError}</p>}
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Start date</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  aria-invalid={showDateError && Boolean(datesError)}
                  aria-describedby={showDateError && datesError ? 'trip-date-error' : undefined}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">End date</span>
                <input
                  type="date"
                  required
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(event) => handleEndDateChange(event.target.value)}
                  aria-invalid={showDateError && Boolean(datesError)}
                  aria-describedby={showDateError && datesError ? 'trip-date-error' : undefined}
                  className={FIELD_CLASS}
                />
              </label>
              {showDateError && datesError && <p id="trip-date-error" className="text-xs font-medium text-red-700 sm:col-span-2">{datesError}</p>}
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Tell us everything you already know</span>
                <textarea
                  rows={6}
                  value={rawContext}
                  onChange={(event) => setRawContext(event.target.value)}
                  placeholder={isEvent ? 'Paste the invite, guest notes, food ideas, setup needs, timing, people helping, and anything that matters.' : 'Paste texts, lodging notes, flight timing, restaurant ideas, must-dos, budget, kids, food preferences, and anything you would tell a travel agent.'}
                  aria-describedby="raw-context-safety"
                  className={FIELD_CLASS}
                />
                <p id="raw-context-safety" className="text-xs leading-5 text-slate-500">
                  Safety note: say what is booked, but do not paste passport numbers, payment details, door codes, passwords, or private confirmation numbers.
                </p>
              </label>
              {sensitiveWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:col-span-2">
                  <p className="text-sm font-semibold text-amber-900">Check this brief before generating</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {sensitiveWarnings.map((warning) => (
                      <li key={warning.id}>
                        <span className="font-semibold">{warning.label}: </span>
                        {warning.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best context to include</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(isEvent ? CONTEXT_HINTS.event : CONTEXT_HINTS.trip).map((hint) => (
                    <span key={hint} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{hint}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mode === 'smart' && (
                <button type="button" onClick={startVoiceCapture} className={SECONDARY_BUTTON}>
                  {listening ? 'Listening...' : 'Use voice capture'}
                </button>
              )}
            </div>
          </section>

          {(step !== 'start' || mode === 'blank') && (
            <section className={CARD_CLASS}>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
                <h2 className="text-xl font-bold text-slate-950">Details that make the draft smarter</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Plan name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder={suggestedName} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Share URL</span>
                  <input
                    value={slugWasEdited ? customSlug : suggestedSlug}
                    onChange={(event) => { setSlugWasEdited(true); setCustomSlug(slugifyTripSlug(event.target.value)) }}
                    placeholder={suggestedSlug}
                    aria-invalid={showStartErrors && Boolean(slugError)}
                    aria-describedby={showStartErrors && slugError ? 'trip-slug-error' : undefined}
                    className={FIELD_CLASS}
                  />
                  {showStartErrors && slugError && <p id="trip-slug-error" className="text-xs font-medium text-red-700">{slugError}</p>}
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{isEvent ? 'Guests or groups' : 'Travelers'}</span>
                  <input value={travelers} onChange={(event) => setTravelers(event.target.value)} placeholder={isEvent ? 'Family, cousins, teammates, friends...' : 'Alex, Jordan, the kids'} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Headcount</span>
                  <input value={guestCount} onChange={(event) => setGuestCount(event.target.value)} placeholder="2 adults, 8 guests, 20 people..." className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{isEvent ? 'Venue name' : 'Stay name'}</span>
                  <input value={isEvent ? venueName : stayName} onChange={(event) => isEvent ? setVenueName(event.target.value) : setStayName(event.target.value)} placeholder={isEvent ? 'House, park, venue, stadium...' : 'Hotel, rental house, resort...'} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{isEvent ? 'Venue address' : 'Stay address'}</span>
                  <input value={isEvent ? venueAddress : stayAddress} onChange={(event) => isEvent ? setVenueAddress(event.target.value) : setStayAddress(event.target.value)} placeholder="Address or neighborhood" className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{isEvent ? 'Setup / start time' : 'Arrival window'}</span>
                  <input value={arrivalWindow} onChange={(event) => setArrivalWindow(event.target.value)} placeholder={isEvent ? 'Setup at 3, guests at 5' : 'Land at 1:30, check-in after 3'} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{isEvent ? 'End / cleanup time' : 'Departure window'}</span>
                  <input value={departureWindow} onChange={(event) => setDepartureWindow(event.target.value)} placeholder={isEvent ? 'Cleanup by 9' : 'Flight leaves at noon'} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Food preferences</span>
                  <input value={foodPreferences} onChange={(event) => setFoodPreferences(event.target.value)} placeholder="Nice dinners, kid snacks, allergies, easy meals..." className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Budget style</span>
                  <input value={budgetStyle} onChange={(event) => setBudgetStyle(event.target.value)} placeholder="Flexible, keep it simple, split costs..." className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Kids / ages</span>
                  <input value={kidsAndAges} onChange={(event) => setKidsAndAges(event.target.value)} placeholder="Ages, naps, gear, stroller..." className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Mobility or comfort notes</span>
                  <input value={mobilityNotes} onChange={(event) => setMobilityNotes(event.target.value)} placeholder="Low walking, shade, seating, accessibility..." className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">{isEvent ? 'Must-have moments' : 'Must-dos'}</span>
                  <textarea rows={4} value={mustDos} onChange={(event) => setMustDos(event.target.value)} placeholder={isEvent ? 'Cake\nGroup photo\nGame setup' : 'Dinner reservation\nBeach day\nOne local activity'} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Already confirmed</span>
                  <textarea rows={3} value={confirmedItems} onChange={(event) => setConfirmedItems(event.target.value)} placeholder="Flight booked\nRestaurant reserved\nVenue confirmed" className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Nice-to-haves</span>
                  <textarea rows={3} value={niceToHaves} onChange={(event) => setNiceToHaves(event.target.value)} placeholder={isEvent ? 'Photo booth\nOutdoor games' : 'Spa time\nCoffee spot\nBackup activity'} className={FIELD_CLASS} />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Pace</span>
                  <select value={pace} onChange={(event) => setPace(event.target.value as TripPace)} className={FIELD_CLASS}>
                    {PACE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Planning style</span>
                  <select value={planningHelp} onChange={(event) => setPlanningHelp(event.target.value as TripPlanningHelp)} className={FIELD_CLASS}>
                    {HELP_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
                {!isEvent && (
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Template</span>
                    <select value={template} onChange={(event) => setTemplate(event.target.value as TripTemplateId)} className={FIELD_CLASS}>
                      {TRIP_TEMPLATE_OPTIONS.filter((option) => option.id !== 'event').map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                )}
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">Created by</span>
                  <input value={createdBy} onChange={(event) => setCreatedBy(event.target.value)} placeholder="Your name" className={FIELD_CLASS} />
                </label>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">Vibe</p>
                <div className="flex flex-wrap gap-2">
                  {VIBE_OPTIONS.map((option) => {
                    const active = vibe.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setVibe((current) => toggleValue(current, option))}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700'}`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {(step === 'questions' || step === 'review') && quality && (
            <section className={CARD_CLASS}>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
                <h2 className="text-xl font-bold text-slate-950">Smart follow-up questions</h2>
                <p className="mt-1 text-sm text-slate-600">Draft strength: <span className="font-semibold">{quality.draftStrength}</span></p>
              </div>
              {quality.warnings.map((warning) => <p key={warning} className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning}</p>)}
              <div className="space-y-3">
                {quality.questions.length === 0 && <p className="text-sm text-slate-600">No extra questions needed. The brief is strong enough for a first draft.</p>}
                {quality.questions.map((item) => (
                  <label key={item.id} className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">{item.question}</span>
                    <textarea rows={2} value={answers[item.id] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={item.reason} className={FIELD_CLASS} />
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 'review' && previewTrip && (
            <section className={CARD_CLASS}>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 4</p>
                <h2 className="text-xl font-bold text-slate-950">Review the draft before saving</h2>
                <p className="mt-1 text-sm text-slate-600">Nothing is written until you accept this preview.</p>
              </div>
              <div className="space-y-3">
                <div className={`rounded-2xl border p-4 ${draftStrengthClass(previewTrip.planner?.draftStrength)}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide">Draft quality</p>
                      <h3 className="mt-1 text-xl font-bold capitalize">{previewTrip.planner?.draftStrength ?? generationSummary?.draftStrength ?? 'medium'} draft</h3>
                      <p className="mt-1 text-sm leading-6">
                        {sourceModeLabel(previewTrip.planner?.sourceMode)}. Anything marked as needing booking or confirmation should be checked before relying on it.
                      </p>
                    </div>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                      {generationSummary?.matchedPackName ?? 'Custom plan'}
                    </span>
                  </div>
                  {(previewTrip.planner?.missingInputs.length ?? 0) > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">What would make it stronger</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {previewTrip.planner?.missingInputs.map((input) => (
                          <span key={input} className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">{input}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {previewTrip.planner?.warnings.map((warning) => <p key={warning} className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning}</p>)}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Days</span>{previewTrip.itinerary.length}</p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Bookings</span>{previewTrip.bookings.length}</p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Tasks</span>{previewTrip.kind === 'event' ? previewTrip.eventTasks?.length ?? 0 : previewTrip.checklist.length}</p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Sources</span>{previewTrip.planner?.sourceRefs.length ?? 0}</p>
                </div>
                {previewTrip.planner?.brief && (
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">Based on this brief</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">Location anchor</span>{previewTrip.planner.brief.stayAddress || previewTrip.planner.brief.venueAddress || previewTrip.planner.brief.locationText || previewTrip.planner.brief.destination}</p>
                      <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">Pace</span>{previewTrip.planner.brief.pace?.replace(/-/g, ' ') || 'Not specified'}</p>
                    </div>
                    {previewTrip.planner.locationLimitations?.length ? (
                      <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                        {previewTrip.planner.locationLimitations[1]}
                      </p>
                    ) : null}
                  </div>
                )}
                {(previewTrip.planner?.miniPlans?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Must-do mini-plans</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {previewTrip.planner?.miniPlans?.slice(0, 6).map((plan) => (
                        <article key={plan.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-950">{plan.title}</span>
                            {plan.status && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">{plan.status.replace(/-/g, ' ')}</span>}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{[plan.recommendedDate, plan.recommendedTimeWindow].filter(Boolean).join(' · ') || 'Flexible block'}</p>
                          {plan.nextStep && <p className="mt-1 text-xs leading-5 text-slate-600">{plan.nextStep}</p>}
                          {plan.logisticsNote && <p className="mt-1 text-xs leading-5 text-slate-600">{plan.logisticsNote}</p>}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {(previewTrip.planner?.recommendations?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Recommended restaurants, activities, and logistics</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {previewTrip.planner?.recommendations?.slice(0, 6).map((candidate) => (
                        <article key={candidate.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-950">{candidate.name}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">{candidate.category}</span>
                          </div>
                          {candidate.addressOrArea && <p className="mt-1 text-xs text-slate-500">{candidate.addressOrArea}</p>}
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{candidate.whyItFits}</p>
                          {candidate.nextStep && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600"><span className="font-semibold">Next: </span>{candidate.nextStep}</p>}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {previewTrip.itinerary.slice(0, 4).map((day) => (
                    <article key={day.date} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{day.date}</p>
                      <h3 className="font-semibold text-slate-950">{day.title ?? 'Plan'}</h3>
                      <ul className="mt-2 space-y-2">
                        {day.items.slice(0, 4).map((item, index) => (
                          <li key={`${day.date}-${index}`} className="text-sm text-slate-700">
                            <span className="font-medium text-slate-950">{item.time ? `${item.time}: ` : ''}{item.title}</span>
                            {item.status && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.status}</span>}
                            {item.why && <p className="mt-1 text-xs text-slate-500">{item.why}</p>}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Must-do and booking next steps</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      ...previewTrip.bookings.map((booking) => ({
                        id: booking.id,
                        title: booking.title,
                        status: booking.status,
                        nextStep: booking.nextStep ?? booking.details,
                      })),
                      ...previewTrip.thingsToDo.slice(0, 4).map((activity) => ({
                        id: activity.id,
                        title: activity.name,
                        status: activity.status,
                        nextStep: activity.nextStep ?? activity.notes,
                      })),
                    ].slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">{item.title}</span>
                          {item.status && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">{item.status.replace(/-/g, ' ')}</span>}
                        </div>
                        {item.nextStep && <p className="mt-1 text-xs leading-5 text-slate-600">{item.nextStep}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                {generationSummary?.sourceRefs.length ? (
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Sources and confirmation notes</p>
                    <ul className="space-y-1 text-sm">
                      {generationSummary.sourceRefs.slice(0, 6).map((source) => (
                        <li key={source.id}>
                          {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">{source.title}</a> : <span>{source.title}</span>}
                          <span className="text-slate-500"> · {source.kind}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {progressCopy && (
            <section
              role="status"
              aria-live="polite"
              className="rounded-3xl border border-blue-200 bg-blue-50 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 h-3 w-3 flex-shrink-0 animate-pulse rounded-full bg-blue-600" aria-hidden />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-950">{progressCopy.title}</p>
                      <p className="mt-1 text-sm leading-6 text-blue-900">{progressCopy.helper}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-800">
                      {pendingElapsedSeconds}s
                    </span>
                  </div>
                  <ol className="grid gap-2 sm:grid-cols-2">
                    {progressCopy.steps.map((item, index) => {
                      const active = index === progressStepIndex
                      const done = index < progressStepIndex
                      return (
                        <li
                          key={item}
                          className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                            active
                              ? 'bg-white text-blue-900 ring-1 ring-blue-200'
                              : done
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-blue-100/70 text-blue-700'
                          }`}
                        >
                          {done ? 'Done: ' : active ? 'Now: ' : ''}
                          {item}
                        </li>
                      )
                    })}
                  </ol>
                  {showSlowHint && (
                    <p className="rounded-2xl bg-white px-3 py-2 text-sm leading-6 text-blue-900">
                      Still working. Live research can be slower than the normal draft path, but this screen will either move forward or show a clear error. Please do not refresh while it is running.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {message && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>}
          {recoverySlug && !saving && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">Need to check whether it saved?</p>
              <p className="mt-1 leading-6">
                Try opening the planned share URL. If it exists, the save finished even if your browser lost the response.
              </p>
              <Link to={`/${recoverySlug}/manage`} className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                Check {recoverySlug}
              </Link>
            </div>
          )}
          {validationErrors && validationErrors.length > 0 && (
            <ul className="rounded-2xl bg-red-50 border border-red-100 p-3 text-sm text-red-800 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={`${error.path}-${index}`}><span className="font-mono text-xs">{error.path}</span>: {error.message}</li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex gap-2">
              {step !== 'start' && (
                <button type="button" onClick={() => setStep(step === 'review' ? 'questions' : step === 'questions' ? 'details' : 'start')} className={`${SECONDARY_BUTTON} flex-1`}>
                  Back
                </button>
              )}
              {step === 'review' && (
                <button type="button" onClick={() => { setPreviewTrip(null); void handlePreview() }} className={`${SECONDARY_BUTTON} flex-1`} disabled={saving}>
                  Regenerate
                </button>
              )}
              <button type="submit" disabled={!canStart} className={`${PRIMARY_BUTTON} flex-[2]`}>
                {primaryLabel}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
