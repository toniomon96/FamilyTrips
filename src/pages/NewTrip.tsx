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
import type { TripGenerationSummary, TripPace, TripPlanningHelp } from '../utils/tripGeneration'

type CreateSuccess = {
  ok: true
  trip: Trip
  generationSummary?: TripGenerationSummary
}

type CreateFailure = {
  ok: false
  error: string
  validationErrors?: { path: string; message: string }[]
}

type CreateResult = CreateSuccess | CreateFailure
type CreateMode = 'smart' | 'blank'

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

const VIBE_OPTIONS = [
  'honeymoon',
  'relaxed',
  'romantic',
  'resort-heavy',
  'luxury',
  'adventure',
  'food-focused',
  'no early mornings',
]

const PACE_OPTIONS: { id: TripPace; label: string }[] = [
  { id: 'very-loose', label: 'Very loose' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'packed', label: 'Packed' },
]

const HELP_OPTIONS: { id: TripPlanningHelp; label: string }[] = [
  { id: 'mostly-plan-for-me', label: 'Mostly plan for me' },
  { id: 'give-me-options', label: 'Give me options' },
  { id: 'start-simple', label: 'Start simple' },
]

async function createTrip(payload: Record<string, unknown>): Promise<CreateResult> {
  const response = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => null)) as CreateResult | null
  if (body) return body
  return { ok: false, error: response.ok ? 'Empty response.' : 'Trip create request failed.' }
}

function parseMustDos(value: string) {
  return value
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title) => ({
      title,
      required: true,
      type: /dinner|restaurant|lunch|breakfast/i.test(title) ? 'dining' : 'activity',
      timing: /lovers|last|final/i.test(title) ? 'last-full-day' : 'any',
    }))
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export default function NewTrip() {
  const navigate = useNavigate()
  const today = todayLocalISO()
  const [mode, setMode] = useState<CreateMode>('smart')
  const [pin, setPin] = useState(() => window.sessionStorage.getItem('familytrips:owner-pin') ?? '')
  const [createdBy, setCreatedBy] = useState('')
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [slugWasEdited, setSlugWasEdited] = useState(false)
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [template, setTemplate] = useState<TripTemplateId>('honeymoon')
  const [travelers, setTravelers] = useState('')
  const [stayName, setStayName] = useState('')
  const [brief, setBrief] = useState('')
  const [vibe, setVibe] = useState<string[]>(['honeymoon', 'relaxed', 'romantic', 'resort-heavy'])
  const [pace, setPace] = useState<TripPace>('very-loose')
  const [planningHelp, setPlanningHelp] = useState<TripPlanningHelp>('mostly-plan-for-me')
  const [mustDos, setMustDos] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<CreateFailure['validationErrors']>([])
  const isSmartMode = mode === 'smart'

  const suggestedSlug = useMemo(() => slugifyTripSlug(name), [name])
  const slug = useMemo(
    () => slugifyTripSlug(slugWasEdited ? customSlug : suggestedSlug),
    [customSlug, slugWasEdited, suggestedSlug],
  )
  const canCreate =
    pin.trim().length > 0 &&
    name.trim().length > 0 &&
    location.trim().length > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    startDate <= endDate &&
    isValidTripSlug(slug) &&
    !saving

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canCreate) return
    setSaving(true)
    setMessage(null)
    setValidationErrors([])

    const payload =
      mode === 'smart'
        ? {
            action: 'generate',
            pin,
            createdBy,
            brief: {
              slug,
              name,
              destination: location,
              startDate,
              endDate,
              template,
              travelers,
              stayName,
              createdBy,
              brief,
              vibe,
              pace,
              planningHelp,
              mustDos: parseMustDos(mustDos),
            },
          }
        : {
            action: 'create',
            pin,
            createdBy,
            trip: createTripShell({
              slug,
              name,
              location,
              startDate,
              endDate,
              template,
              travelers,
              stayName,
              createdBy,
            }),
          }

    const result = await createTrip(payload)

    if (!result.ok) {
      setSaving(false)
      setMessage(result.error)
      setValidationErrors(result.validationErrors ?? [])
      return
    }

    window.sessionStorage.setItem('familytrips:owner-pin', pin.trim())
    window.dispatchEvent(new CustomEvent('familytrips:trip-overrides-changed', { detail: { tripSlug: result.trip.slug } }))
    navigate(mode === 'smart' ? `/${result.trip.slug}/manage?created=1&draft=generated` : `/${result.trip.slug}/manage`)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-12 space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <span aria-hidden>←</span>
          <span>All trips</span>
        </Link>

        <header className="rounded-3xl bg-slate-900 text-white p-5 shadow-sm space-y-4">
          <div className="space-y-2">
            <p className="text-slate-300 text-sm uppercase tracking-wide">Create a trip</p>
            <h1 className="text-3xl font-bold leading-tight">
              {isSmartMode ? 'Build a first draft' : 'Start with a blank trip'}
            </h1>
            <p className="text-slate-300">
              {isSmartMode
                ? 'Add the basics, the vibe, and the must-dos. FamilyTrips will create the plan and open the editor for quick tweaks.'
                : 'Create an unlisted starter shell and fill in the details from the editor.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'smart' ? 'bg-white text-slate-900' : 'text-white'}`}
            >
              Build my trip
            </button>
            <button
              type="button"
              onClick={() => setMode('blank')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'blank' ? 'bg-white text-slate-900' : 'text-white'}`}
            >
              Start blank
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-5">
          <input
            type="text"
            autoComplete="username"
            value="trip-editor"
            readOnly
            tabIndex={-1}
            className="sr-only"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Trip edit PIN</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Trip name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (!slugWasEdited) setCustomSlug(slugifyTripSlug(event.target.value))
                }}
                placeholder="Logan + Morgan Honeymoon"
                className={FIELD_CLASS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Share URL</label>
              <div className="grid grid-cols-[auto_1fr] items-center rounded-xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                <span className="pl-3 pr-1 text-sm text-slate-500">/</span>
                <input
                  type="text"
                  required
                  value={slugWasEdited ? customSlug : suggestedSlug}
                  onChange={(event) => {
                    setSlugWasEdited(true)
                    setCustomSlug(slugifyTripSlug(event.target.value))
                  }}
                  placeholder="logan-morgan-honeymoon"
                  className="w-full rounded-r-xl border-0 bg-transparent px-2 py-2 text-sm text-slate-900 focus:outline-none"
                />
              </div>
              {slug && (
                <p className="mt-1 text-xs text-slate-500">
                  Opens at <span className="font-mono">/{slug}</span>
                </p>
              )}
              {!isValidTripSlug(slug) && name.trim() && (
                <p className="mt-1 text-xs text-red-700">Use letters, numbers, and hyphens.</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination or stay</label>
              <input
                type="text"
                required
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Le Blanc Spa Resort Los Cabos"
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Travelers</label>
              <input
                type="text"
                value={travelers}
                onChange={(event) => setTravelers(event.target.value)}
                placeholder="Logan, Morgan"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          {mode === 'smart' && (
            <div className="space-y-5 border-t border-slate-100 pt-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trip brief</label>
                <textarea
                  rows={4}
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Honeymoon at Le Blanc. Keep it relaxed and romantic. They definitely want golf, horseback riding on the beach, and Lovers Beach."
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-slate-700 mb-2">Vibe</p>
                <div className="flex flex-wrap gap-2">
                  {VIBE_OPTIONS.map((option) => {
                    const active = vibe.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setVibe((current) => toggleValue(current, option))}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                          active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pace</label>
                  <select value={pace} onChange={(event) => setPace(event.target.value as TripPace)} className={FIELD_CLASS}>
                    {PACE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Planning style</label>
                  <select
                    value={planningHelp}
                    onChange={(event) => setPlanningHelp(event.target.value as TripPlanningHelp)}
                    className={FIELD_CLASS}
                  >
                    {HELP_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Must-dos</label>
                <textarea
                  rows={4}
                  value={mustDos}
                  onChange={(event) => setMustDos(event.target.value)}
                  placeholder={"Golf\nHorseback riding on the beach\nLovers Beach"}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Template</label>
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value as TripTemplateId)}
                className={FIELD_CLASS}
              >
                {TRIP_TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stay name</label>
              <input
                type="text"
                value={stayName}
                onChange={(event) => setStayName(event.target.value)}
                placeholder="Resort, hotel, house..."
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Created by</label>
              <input
                type="text"
                value={createdBy}
                onChange={(event) => setCreatedBy(event.target.value)}
                placeholder="Logan"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          {startDate > endDate && (
            <p className="text-sm text-red-700">End date must be the same day or after the start date.</p>
          )}

          {message && <p className="text-sm text-red-700">{message}</p>}

          {validationErrors && validationErrors.length > 0 && (
            <ul className="rounded-2xl bg-red-50 border border-red-100 p-3 text-sm text-red-800 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={`${error.path}-${index}`}>
                  <span className="font-mono text-xs">{error.path}</span>: {error.message}
                </li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={!canCreate}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? (mode === 'smart' ? 'Building...' : 'Creating...') : mode === 'smart' ? 'Build my trip' : 'Create blank trip'}
          </button>
        </form>
      </main>
    </div>
  )
}
