import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createTripShell,
  isValidTripSlug,
  slugifyTripSlug,
  TRIP_TEMPLATE_OPTIONS,
  type TripTemplateId,
} from '../utils/tripShell'
import { todayLocalISO } from '../utils/formatters'
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

async function postTrip(payload: Record<string, unknown>): Promise<ApiResult> {
  const response = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => null)) as ApiResult | null
  if (body) return body
  return { ok: false, error: response.ok ? 'Empty response.' : 'Trip request failed.' }
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

  const suggestedName = useMemo(() => name.trim() || `${destination.trim() || (planType === 'event' ? 'Family event' : 'Family trip')} ${planType === 'event' ? 'plan' : 'trip'}`, [destination, name, planType])
  const suggestedSlug = useMemo(() => slugifyTripSlug(suggestedName), [suggestedName])
  const slug = useMemo(
    () => slugifyTripSlug(slugWasEdited ? customSlug : suggestedSlug),
    [customSlug, slugWasEdited, suggestedSlug],
  )
  const canStart = pin.trim().length > 0 && destination.trim().length > 0 && startDate <= endDate && isValidTripSlug(slug) && !saving
  const isEvent = planType === 'event'

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

  async function handleQuestions(nextAnswers = answers) {
    setSaving(true)
    setMessage(null)
    setValidationErrors([])
    const result = await postTrip({ action: 'briefQuestions', pin, brief: buildBrief(nextAnswers) })
    setSaving(false)
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
    setSaving(true)
    setMessage(null)
    setValidationErrors([])
    const result = await postTrip({ action: 'preview', pin, brief: buildBrief(nextAnswers) })
    setSaving(false)
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
    setSaving(true)
    setMessage(null)
    setValidationErrors([])
    const result = await postTrip({
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
    })
    setSaving(false)
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
    setSaving(true)
    setMessage(null)
    setValidationErrors([])
    const result = await postTrip({ action: 'create', pin, createdBy, trip: previewTrip })
    setSaving(false)
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
    if (!canStart) return
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
    setQuality(null)
    setPreviewTrip(null)
    setGenerationSummary(null)
    setMessage(null)
    setValidationErrors([])
  }

  const primaryLabel =
    mode === 'blank'
      ? saving ? 'Creating...' : 'Create blank trip'
      : step === 'start'
        ? 'Add details'
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
            <button type="button" onClick={() => switchMode('smart')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'smart' ? 'bg-white text-slate-950' : 'text-white'}`}>
              Build my plan
            </button>
            <button type="button" onClick={() => switchMode('blank')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'blank' ? 'bg-white text-slate-950' : 'text-white'}`}>
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
                <input type="password" autoComplete="current-password" required value={pin} onChange={(event) => setPin(event.target.value)} className={FIELD_CLASS} />
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:col-span-2">
                <button type="button" onClick={() => setPlanType('trip')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${planType === 'trip' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>
                  Trip
                </button>
                <button type="button" onClick={() => setPlanType('event')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${planType === 'event' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'}`}>
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
                <input required value={destination} onChange={(event) => setDestination(event.target.value)} placeholder={isEvent ? 'Backyard, park, stadium, house, venue...' : 'Le Blanc Los Cabos, Charleston, lake house...'} className={FIELD_CLASS} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Start date</span>
                <input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={FIELD_CLASS} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">End date</span>
                <input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} className={FIELD_CLASS} />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Tell us everything you already know</span>
                <textarea rows={6} value={rawContext} onChange={(event) => setRawContext(event.target.value)} placeholder={isEvent ? 'Paste the invite, guest notes, food ideas, setup needs, timing, people helping, and anything that matters.' : 'Paste texts, lodging notes, flight timing, restaurant ideas, must-dos, budget, kids, food preferences, and anything you would tell a travel agent.'} className={FIELD_CLASS} />
              </label>
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
                  <input value={slugWasEdited ? customSlug : suggestedSlug} onChange={(event) => { setSlugWasEdited(true); setCustomSlug(slugifyTripSlug(event.target.value)) }} placeholder={suggestedSlug} className={FIELD_CLASS} />
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
                      <button key={option} type="button" onClick={() => setVibe((current) => toggleValue(current, option))} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700'}`}>
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
                {previewTrip.planner?.warnings.map((warning) => <p key={warning} className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning}</p>)}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Days</span>{previewTrip.itinerary.length}</p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Bookings</span>{previewTrip.bookings.length}</p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Tasks</span>{previewTrip.kind === 'event' ? previewTrip.eventTasks?.length ?? 0 : previewTrip.checklist.length}</p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">Sources</span>{previewTrip.planner?.sourceRefs.length ?? 0}</p>
                </div>
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

          {startDate > endDate && <p className="text-sm text-red-700">End date must be the same day or after the start date.</p>}
          {message && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>}
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
