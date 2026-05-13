import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Section from '../components/Section'
import { getTrip } from '../data/trips'
import { useTrip } from '../context/tripContextCore'
import type {
  Activity,
  Booking,
  BudgetItem,
  ChecklistItem,
  Contact,
  CopyBlock,
  Day,
  EventFoodItem,
  ItineraryItem,
  PackingItem,
  Person,
  PlanKind,
  Stay,
  Trip,
} from '../types/trip'
import { formatTimeAgo } from '../utils/formatters'
import {
  cloneTrip,
  editableFieldsFromTrip,
  makeStableIdFromLabel,
  validateEditableTrip,
  type TripOverrideHistoryRow,
  type TripOverrideRow,
} from '../utils/tripOverrides'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type FieldKind = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
type ValidationMessage = { path: string; message: string }

type SelectOption = {
  value: string
  label: string
}

type FieldConfig<T extends { id: string }> = {
  key: keyof T & string
  label: string
  kind?: FieldKind
  options?: SelectOption[]
  placeholder?: string
  required?: boolean
}

type OwnerApiSuccess = {
  ok: true
  row?: TripOverrideRow
  history?: TripOverrideHistoryRow[]
  mergedTrip?: Trip
}

type OwnerApiFailure = {
  ok: false
  error: string
  validationErrors?: ValidationMessage[]
}

type OwnerApiResult = OwnerApiSuccess | OwnerApiFailure

const FIELD_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

const COMPACT_BUTTON =
  'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 active:scale-[0.98]'

const BOOKING_KIND_OPTIONS: SelectOption[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'stay', label: 'Stay' },
  { value: 'car', label: 'Car' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
]

const CONTACT_KIND_OPTIONS: SelectOption[] = [
  { value: '', label: 'Phone by default' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Text' },
]

const BUDGET_STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'No status' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'tbd', label: 'TBD' },
]

const TRIP_KIND_OPTIONS: SelectOption[] = [
  { value: '', label: 'Trip' },
  { value: 'trip', label: 'Trip' },
  { value: 'event', label: 'Event' },
]

const VISIBILITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Listed' },
  { value: 'listed', label: 'Listed' },
  { value: 'unlisted', label: 'Unlisted' },
]

function existingIds(items: { id: string }[]): string[] {
  return items.map((item) => item.id)
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.length) return items
  const next = items.slice()
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  return next
}

function optionValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function fieldValue(value: unknown): string | number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') return value
  return ''
}

function setRecordValue<T extends { id: string }>(
  item: T,
  key: keyof T & string,
  value: unknown,
): T {
  const next = { ...item } as Record<string, unknown>
  if (value === undefined) delete next[key]
  else next[key] = value
  return next as T
}

function coerceInputValue(kind: FieldKind, raw: string, checked: boolean, required?: boolean): unknown {
  if (kind === 'checkbox') return checked
  if (kind === 'number') return raw.trim() === '' ? 0 : Number(raw)
  if (!required && raw.trim() === '') return undefined
  return raw
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string | number | undefined
  onChange: (value: string) => void
  type?: 'text' | 'date' | 'number'
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        required={required}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CLASS}
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        value={value ?? ''}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CLASS}
      />
    </label>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  options: SelectOption[]
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={FIELD_CLASS}>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <button type="button" className={COMPACT_BUTTON} onClick={() => onChange([...items, ''])}>
          + Add
        </button>
      </div>
      {items.length === 0 && <p className="text-sm text-slate-500">Nothing listed yet.</p>}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <input
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const next = items.slice()
                next[index] = event.target.value
                onChange(next)
              }}
              className={FIELD_CLASS}
            />
            <button
              type="button"
              className={COMPACT_BUTTON}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ArrayField<T extends { id: string }>({
  item,
  field,
  onChange,
}: {
  item: T
  field: FieldConfig<T>
  onChange: (item: T) => void
}) {
  const record = item as Record<string, unknown>
  const kind = field.kind ?? 'text'

  if (kind === 'textarea') {
    return (
      <TextArea
        label={field.label}
        value={typeof record[field.key] === 'string' ? (record[field.key] as string) : undefined}
        placeholder={field.placeholder}
        onChange={(value) => onChange(setRecordValue(item, field.key, value.trim() ? value : undefined))}
      />
    )
  }

  if (kind === 'select') {
    return (
      <SelectInput
        label={field.label}
        value={optionValue(record[field.key])}
        options={field.options ?? []}
        onChange={(value) => onChange(setRecordValue(item, field.key, value || undefined))}
      />
    )
  }

  if (kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
        <input
          type="checkbox"
          checked={record[field.key] === true}
          onChange={(event) => onChange(setRecordValue(item, field.key, event.target.checked))}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
      </label>
    )
  }

  return (
    <TextInput
      label={field.label}
      type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text'}
      value={fieldValue(record[field.key])}
      placeholder={field.placeholder}
      required={field.required}
      onChange={(value) =>
        onChange(setRecordValue(item, field.key, coerceInputValue(kind, value, false, field.required)))
      }
    />
  )
}

function ObjectArrayEditor<T extends { id: string }>({
  items,
  onChange,
  fields,
  createItem,
  addLabel,
  emptyText,
  getTitle,
  renderExtra,
}: {
  items: T[]
  onChange: (items: T[]) => void
  fields: FieldConfig<T>[]
  createItem: (items: T[]) => T
  addLabel: string
  emptyText: string
  getTitle: (item: T) => string
  renderExtra?: (item: T, index: number, updateItem: (item: T) => void) => ReactNode
}) {
  function updateAt(index: number, item: T) {
    const next = items.slice()
    next[index] = item
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{items.length} item{items.length === 1 ? '' : 's'}</p>
        <button type="button" className={COMPACT_BUTTON} onClick={() => onChange([...items, createItem(items)])}>
          + {addLabel}
        </button>
      </div>
      {items.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}
      <ul className="space-y-4">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{getTitle(item)}</p>
                <p className="text-xs text-slate-500 font-mono break-all">{item.id}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                <button
                  type="button"
                  className={COMPACT_BUTTON}
                  onClick={() => onChange(moveItem(items, index, -1))}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={COMPACT_BUTTON}
                  onClick={() => onChange(moveItem(items, index, 1))}
                  disabled={index === items.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className={`${COMPACT_BUTTON} text-red-700`}
                  onClick={() => {
                    if (window.confirm(`Delete "${getTitle(item)}"?`)) {
                      onChange(items.filter((_, i) => i !== index))
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((field) => (
                <ArrayField
                  key={`${item.id}-${field.key}`}
                  item={item}
                  field={field}
                  onChange={(nextItem) => updateAt(index, nextItem)}
                />
              ))}
            </div>
            {renderExtra?.(item, index, (nextItem) => updateAt(index, nextItem))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ItineraryEditor({
  days,
  startDate,
  onChange,
}: {
  days: Day[]
  startDate: string
  onChange: (days: Day[]) => void
}) {
  function updateDay(index: number, day: Day) {
    const next = days.slice()
    next[index] = day
    onChange(next)
  }

  function updateItem(day: Day, itemIndex: number, item: ItineraryItem): Day {
    const items = day.items.slice()
    items[itemIndex] = item
    return { ...day, items }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{days.length} day{days.length === 1 ? '' : 's'}</p>
        <button
          type="button"
          className={COMPACT_BUTTON}
          onClick={() => onChange([...days, { date: startDate, title: 'New day', items: [] }])}
        >
          + Add day
        </button>
      </div>
      {days.length === 0 && <p className="text-sm text-slate-500">No itinerary yet.</p>}
      <ul className="space-y-4">
        {days.map((day, dayIndex) => (
          <li key={`${day.date}-${dayIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{day.title || day.date}</p>
                <p className="text-xs text-slate-500">{day.items.length} plan item{day.items.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                <button type="button" className={COMPACT_BUTTON} onClick={() => onChange(moveItem(days, dayIndex, -1))} disabled={dayIndex === 0}>
                  Up
                </button>
                <button type="button" className={COMPACT_BUTTON} onClick={() => onChange(moveItem(days, dayIndex, 1))} disabled={dayIndex === days.length - 1}>
                  Down
                </button>
                <button
                  type="button"
                  className={`${COMPACT_BUTTON} text-red-700`}
                  onClick={() => {
                    if (window.confirm(`Delete "${day.title || day.date}"?`)) {
                      onChange(days.filter((_, i) => i !== dayIndex))
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextInput label="Date" type="date" value={day.date} onChange={(value) => updateDay(dayIndex, { ...day, date: value })} />
              <TextInput label="Title" value={day.title} onChange={(value) => updateDay(dayIndex, { ...day, title: value || undefined })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan items</p>
                <button
                  type="button"
                  className={COMPACT_BUTTON}
                  onClick={() => updateDay(dayIndex, { ...day, items: [...day.items, { title: 'New plan item' }] })}
                >
                  + Add plan item
                </button>
              </div>
              <ul className="space-y-3">
                {day.items.map((item, itemIndex) => (
                  <li key={`${day.date}-${itemIndex}`} className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.title || 'Plan item'}</p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={COMPACT_BUTTON}
                          onClick={() => updateDay(dayIndex, { ...day, items: moveItem(day.items, itemIndex, -1) })}
                          disabled={itemIndex === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className={COMPACT_BUTTON}
                          onClick={() => updateDay(dayIndex, { ...day, items: moveItem(day.items, itemIndex, 1) })}
                          disabled={itemIndex === day.items.length - 1}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className={`${COMPACT_BUTTON} text-red-700`}
                          onClick={() => updateDay(dayIndex, { ...day, items: day.items.filter((_, i) => i !== itemIndex) })}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TextInput label="Time" value={item.time} onChange={(value) => updateDay(dayIndex, updateItem(day, itemIndex, { ...item, time: value || undefined }))} />
                      <TextInput label="Title" value={item.title} required onChange={(value) => updateDay(dayIndex, updateItem(day, itemIndex, { ...item, title: value }))} />
                      <TextInput label="Address" value={item.address} onChange={(value) => updateDay(dayIndex, updateItem(day, itemIndex, { ...item, address: value || undefined }))} />
                      <TextInput label="Link" value={item.link} onChange={(value) => updateDay(dayIndex, updateItem(day, itemIndex, { ...item, link: value || undefined }))} />
                    </div>
                    <TextArea label="Notes" value={item.notes} onChange={(value) => updateDay(dayIndex, updateItem(day, itemIndex, { ...item, notes: value || undefined }))} />
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function validationSummary(errors: ValidationMessage[]) {
  if (errors.length === 0) return null
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">Fix these before saving:</p>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        {errors.map((error, index) => (
          <li key={`${error.path}-${index}`}>
            <span className="font-mono text-xs">{error.path}</span>: {error.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

async function ownerRequest(payload: Record<string, unknown>): Promise<OwnerApiResult> {
  const response = await fetch('/api/trip-overrides', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json().catch(() => null)) as OwnerApiResult | null
  if (body) return body
  return { ok: false, error: response.ok ? 'Empty response.' : 'Owner request failed.' }
}

export default function ManageTrip() {
  const effectiveTrip = useTrip()
  const [searchParams] = useSearchParams()
  const seedTrip = useMemo(() => getTrip(effectiveTrip.slug) ?? effectiveTrip, [effectiveTrip])
  const [draft, setDraft] = useState<Trip>(() => cloneTrip(effectiveTrip))
  const [dirty, setDirty] = useState(false)
  const [pin, setPin] = useState(() => window.sessionStorage.getItem('familytrips:owner-pin') ?? '')
  const [history, setHistory] = useState<TripOverrideHistoryRow[]>([])
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [serverErrors, setServerErrors] = useState<ValidationMessage[]>([])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!dirty) setDraft(cloneTrip(effectiveTrip))
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [dirty, effectiveTrip])

  useEffect(() => {
    if (pin.trim()) window.sessionStorage.setItem('familytrips:owner-pin', pin.trim())
  }, [pin])

  const validationErrors = useMemo(
    () => validateEditableTrip(seedTrip, editableFieldsFromTrip(draft)).map(({ path, message }) => ({ path, message })),
    [seedTrip, draft],
  )

  const allErrors = serverErrors.length ? serverErrors : validationErrors

  function patchDraft(patch: Partial<Trip>) {
    setDirty(true)
    setServerErrors([])
    setDraft((prev) => ({ ...prev, ...patch, slug: prev.slug }))
  }

  function patchStay(patch: Partial<Stay>) {
    patchDraft({ stay: { ...draft.stay, ...patch } })
  }

  function replaceFromApi(result: OwnerApiSuccess) {
    if (result.history) setHistory(result.history)
    if (result.mergedTrip) {
      setDraft(cloneTrip(result.mergedTrip))
      setDirty(false)
    }
    window.dispatchEvent(new CustomEvent('familytrips:trip-overrides-changed', { detail: { tripSlug: draft.slug } }))
  }

  async function handleLoadHistory() {
    setSaveState('saving')
    setMessage(null)
    const result = await ownerRequest({ action: 'history', tripSlug: draft.slug, pin })
    if (!result.ok) {
      setSaveState('error')
      setMessage(result.error)
      return
    }
    setHistory(result.history ?? [])
    setSaveState('idle')
    setMessage('History loaded.')
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setServerErrors([])
    setMessage(null)

    if (validationErrors.length > 0) {
      setSaveState('error')
      setMessage('Fix validation errors before saving.')
      return
    }

    setSaveState('saving')
    const result = await ownerRequest({
      action: 'save',
      tripSlug: draft.slug,
      pin,
      data: editableFieldsFromTrip(draft),
      updatedBy: 'owner',
    })

    if (!result.ok) {
      setSaveState('error')
      setMessage(result.error)
      setServerErrors(result.validationErrors ?? [])
      return
    }

    replaceFromApi(result)
    setSaveState('saved')
    setMessage(`Saved version ${result.row?.version ?? ''}.`.trim())
  }

  async function handleRestore(version: number) {
    if (!window.confirm(`Restore version ${version}? This publishes it live.`)) return
    setSaveState('saving')
    setMessage(null)
    const result = await ownerRequest({
      action: 'restore',
      tripSlug: draft.slug,
      pin,
      version,
      updatedBy: 'owner',
    })
    if (!result.ok) {
      setSaveState('error')
      setMessage(result.error)
      setServerErrors(result.validationErrors ?? [])
      return
    }
    replaceFromApi(result)
    setSaveState('saved')
    setMessage(`Restored version ${version}.`)
  }

  const canSave = pin.trim().length > 0 && dirty && validationErrors.length === 0 && saveState !== 'saving'
  const showGeneratedDraftPanel = searchParams.get('created') === '1' && searchParams.get('draft') === 'generated'

  async function handleCopyTripLink() {
    const tripUrl = `${window.location.origin}/${draft.slug}`
    try {
      await window.navigator.clipboard.writeText(tripUrl)
      setSaveState('idle')
      setMessage('Trip link copied.')
    } catch {
      setSaveState('error')
      setMessage(tripUrl)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <header className="space-y-3">
        <Link to={`/${draft.slug}`} className="text-sm text-slate-600 hover:text-slate-900">
          Back to trip
        </Link>
        <div className="rounded-3xl bg-slate-900 text-white p-5 shadow-sm space-y-3">
          <div>
            <p className="text-slate-300 text-sm uppercase tracking-wide">Trip workspace</p>
            <h1 className="text-3xl font-bold leading-tight">Manage {draft.name}</h1>
            <p className="text-slate-300 mt-1">Edits publish live for everyone viewing this trip.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
              type="text"
              autoComplete="username"
              value="trip-editor"
              readOnly
              tabIndex={-1}
              className="sr-only"
            />
            <input
              type="password"
              autoComplete="current-password"
              value={pin}
              placeholder="Trip edit PIN"
              onChange={(event) => setPin(event.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {saveState === 'saving' ? 'Saving...' : dirty ? 'Save live' : 'Saved'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white"
              onClick={handleLoadHistory}
              disabled={!pin.trim() || saveState === 'saving'}
            >
              Load history
            </button>
            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white"
              onClick={() => {
                setDraft(cloneTrip(effectiveTrip))
                setDirty(false)
                setServerErrors([])
                setMessage('Reset to the currently published trip.')
              }}
            >
              Reset draft
            </button>
          </div>
          {message && (
            <p className={saveState === 'error' ? 'text-sm text-red-200' : 'text-sm text-slate-200'}>
              {message}
            </p>
          )}
        </div>
      </header>

      {showGeneratedDraftPanel && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Draft created</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Your first trip plan is ready to review.</h2>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p className="rounded-2xl bg-white px-3 py-2">Review the itinerary flow and move anything that feels too packed.</p>
                <p className="rounded-2xl bg-white px-3 py-2">Confirm restaurants, dress codes, and must-do activity logistics.</p>
                <p className="rounded-2xl bg-white px-3 py-2">Use bookings and checklist items as the reservation follow-up list.</p>
                <p className="rounded-2xl bg-white px-3 py-2">Open copyable messages for a ready-to-send trip summary.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link
                to={`/${draft.slug}`}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                View trip
              </Link>
              <button
                type="button"
                onClick={handleCopyTripLink}
                className="rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800"
              >
                Copy trip link
              </button>
            </div>
          </div>
        </section>
      )}

      {validationSummary(allErrors)}

      <Section title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="Trip name" value={draft.name} required onChange={(value) => patchDraft({ name: value })} />
          <TextInput label="Location" value={draft.location} required onChange={(value) => patchDraft({ location: value })} />
          <TextInput label="Start date" type="date" value={draft.startDate} required onChange={(value) => patchDraft({ startDate: value })} />
          <TextInput label="End date" type="date" value={draft.endDate} required onChange={(value) => patchDraft({ endDate: value })} />
          <SelectInput label="Kind" value={draft.kind ?? ''} options={TRIP_KIND_OPTIONS} onChange={(value) => patchDraft({ kind: (value || undefined) as PlanKind | undefined })} />
          <SelectInput label="Visibility" value={draft.visibility ?? ''} options={VISIBILITY_OPTIONS} onChange={(value) => patchDraft({ visibility: (value || undefined) as Trip['visibility'] })} />
          <TextInput label="Currency" value={draft.currency} required onChange={(value) => patchDraft({ currency: value || '$' })} />
          <TextInput label="Hero image URL/path" value={draft.heroImage} onChange={(value) => patchDraft({ heroImage: value || undefined })} />
        </div>
        <TextArea label="Tagline" value={draft.tagline} onChange={(value) => patchDraft({ tagline: value || undefined })} />
      </Section>

      <Section title={draft.kind === 'event' ? 'Location' : 'Stay'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="Name" value={draft.stay.name} required onChange={(value) => patchStay({ name: value })} />
          <TextInput label="Address" value={draft.stay.address} required onChange={(value) => patchStay({ address: value })} />
          <TextInput label={draft.kind === 'event' ? 'Starts' : 'Check-in'} value={draft.stay.checkIn} required onChange={(value) => patchStay({ checkIn: value })} />
          <TextInput label={draft.kind === 'event' ? 'Ends' : 'Check-out'} value={draft.stay.checkOut} required onChange={(value) => patchStay({ checkOut: value })} />
          <TextInput label="Wi-Fi name" value={draft.stay.wifiSsid} onChange={(value) => patchStay({ wifiSsid: value || undefined })} />
          <TextInput label="Wi-Fi password" value={draft.stay.wifiPassword} onChange={(value) => patchStay({ wifiPassword: value || undefined })} />
          <TextInput label="Booking link" value={draft.stay.bookingLink} onChange={(value) => patchStay({ bookingLink: value || undefined })} />
          <TextInput label="Confirmation" value={draft.stay.confirmation} onChange={(value) => patchStay({ confirmation: value || undefined })} />
          <TextInput label="Host name" value={draft.stay.hostName} onChange={(value) => patchStay({ hostName: value || undefined })} />
          <TextInput label="Host phone" value={draft.stay.hostPhone} onChange={(value) => patchStay({ hostPhone: value || undefined })} />
        </div>
        <TextArea label="Notes" rows={5} value={draft.stay.notes} onChange={(value) => patchStay({ notes: value || undefined })} />
        <StringListEditor
          label="Amenities"
          items={draft.stay.amenities}
          placeholder="e.g. Hot tub"
          onChange={(items) => patchStay({ amenities: items })}
        />
      </Section>

      <Section title="Bookings">
        <ObjectArrayEditor<Booking>
          items={draft.bookings}
          onChange={(bookings) => patchDraft({ bookings })}
          addLabel="Booking"
          emptyText="No bookings yet."
          getTitle={(item) => item.title || 'Booking'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('bk', 'new booking', existingIds(items)),
            kind: 'activity',
            title: 'New booking',
          })}
          fields={[
            { key: 'kind', label: 'Kind', kind: 'select', options: BOOKING_KIND_OPTIONS, required: true },
            { key: 'title', label: 'Title', required: true },
            { key: 'when', label: 'Date', kind: 'date' },
            { key: 'confirmation', label: 'Confirmation' },
            { key: 'link', label: 'Link' },
            { key: 'details', label: 'Details', kind: 'textarea' },
          ] as FieldConfig<Booking>[]}
        />
      </Section>

      <Section title={draft.kind === 'event' ? 'Schedule' : 'Itinerary'}>
        <ItineraryEditor days={draft.itinerary} startDate={draft.startDate} onChange={(itinerary) => patchDraft({ itinerary })} />
      </Section>

      <Section title="Ideas And Places">
        <ObjectArrayEditor<Activity>
          items={draft.thingsToDo}
          onChange={(thingsToDo) => patchDraft({ thingsToDo })}
          addLabel="Place"
          emptyText="No ideas listed yet."
          getTitle={(item) => item.name || 'Place'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('td', 'new place', existingIds(items)),
            name: 'New place',
          })}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'category', label: 'Category' },
            { key: 'address', label: 'Address' },
            { key: 'url', label: 'URL' },
            { key: 'notes', label: 'Notes', kind: 'textarea' },
          ] as FieldConfig<Activity>[]}
        />
      </Section>

      <Section title="People">
        <ObjectArrayEditor<Person>
          items={draft.people}
          onChange={(people) => patchDraft({ people })}
          addLabel="Person"
          emptyText="No people listed yet."
          getTitle={(item) => item.name || 'Person'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('p', 'new person', existingIds(items)),
            name: 'New person',
          })}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'role', label: 'Role' },
            { key: 'phone', label: 'Phone' },
            { key: 'arriving', label: 'Arriving' },
            { key: 'leaving', label: 'Leaving' },
          ] as FieldConfig<Person>[]}
        />
      </Section>

      <Section title="Contacts">
        <ObjectArrayEditor<Contact>
          items={draft.contacts}
          onChange={(contacts) => patchDraft({ contacts })}
          addLabel="Contact"
          emptyText="No contacts listed yet."
          getTitle={(item) => item.label || 'Contact'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('c', 'new contact', existingIds(items)),
            label: 'New contact',
            value: '',
            kind: 'text',
          })}
          fields={[
            { key: 'label', label: 'Label', required: true },
            { key: 'value', label: 'Value', required: true },
            { key: 'kind', label: 'Kind', kind: 'select', options: CONTACT_KIND_OPTIONS },
            { key: 'notes', label: 'Notes', kind: 'textarea' },
          ] as FieldConfig<Contact>[]}
        />
      </Section>

      <Section title={draft.kind === 'event' ? 'Tasks' : 'Checklist'}>
        <ObjectArrayEditor<ChecklistItem>
          items={draft.checklist}
          onChange={(checklist) => patchDraft({ checklist })}
          addLabel="Checklist item"
          emptyText="No checklist items yet."
          getTitle={(item) => item.title || 'Checklist item'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('ck', 'new task', existingIds(items)),
            title: 'New task',
            category: 'Admin',
            done: false,
          })}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'category', label: 'Category', required: true },
            { key: 'done', label: 'Done by default', kind: 'checkbox' },
            { key: 'notes', label: 'Notes', kind: 'textarea' },
          ] as FieldConfig<ChecklistItem>[]}
        />
      </Section>

      {(draft.kind === 'event' || (draft.eventTasks?.length ?? 0) > 0) && (
        <Section title="Event Tasks">
          <ObjectArrayEditor<ChecklistItem>
            items={draft.eventTasks ?? []}
            onChange={(eventTasks) => patchDraft({ eventTasks })}
            addLabel="Event task"
            emptyText="No event-only tasks yet."
            getTitle={(item) => item.title || 'Event task'}
            createItem={(items) => ({
              id: makeStableIdFromLabel('et', 'new event task', existingIds(items)),
              title: 'New event task',
              category: 'Admin',
              done: false,
            })}
            fields={[
              { key: 'title', label: 'Title', required: true },
              { key: 'category', label: 'Category', required: true },
              { key: 'done', label: 'Done by default', kind: 'checkbox' },
              { key: 'notes', label: 'Notes', kind: 'textarea' },
            ] as FieldConfig<ChecklistItem>[]}
          />
        </Section>
      )}

      <Section title={draft.kind === 'event' ? 'Supplies' : 'Packing'}>
        <ObjectArrayEditor<PackingItem>
          items={draft.packing ?? []}
          onChange={(packing) => patchDraft({ packing })}
          addLabel={draft.kind === 'event' ? 'Supply' : 'Packing item'}
          emptyText="No packing or supply items yet."
          getTitle={(item) => item.title || 'Packing item'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('pk', 'new item', existingIds(items)),
            title: 'New item',
            category: 'Other',
          })}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'category', label: 'Category', required: true },
            { key: 'quantity', label: 'Quantity' },
            { key: 'assignedTo', label: 'For / assigned to' },
            { key: 'packed', label: 'Packed by default', kind: 'checkbox' },
            { key: 'notes', label: 'Notes', kind: 'textarea' },
          ] as FieldConfig<PackingItem>[]}
        />
      </Section>

      {(draft.kind === 'event' || (draft.supplies?.length ?? 0) > 0) && (
        <Section title="Event Supplies">
          <ObjectArrayEditor<PackingItem>
            items={draft.supplies ?? []}
            onChange={(supplies) => patchDraft({ supplies })}
            addLabel="Supply"
            emptyText="No event supply list yet."
            getTitle={(item) => item.title || 'Supply'}
            createItem={(items) => ({
              id: makeStableIdFromLabel('sup', 'new supply', existingIds(items)),
              title: 'New supply',
              category: 'Other',
            })}
            fields={[
              { key: 'title', label: 'Title', required: true },
              { key: 'category', label: 'Category', required: true },
              { key: 'quantity', label: 'Quantity' },
              { key: 'assignedTo', label: 'For / assigned to' },
              { key: 'packed', label: 'Packed by default', kind: 'checkbox' },
              { key: 'notes', label: 'Notes', kind: 'textarea' },
            ] as FieldConfig<PackingItem>[]}
          />
        </Section>
      )}

      {(draft.kind === 'event' || (draft.food?.length ?? 0) > 0) && (
        <Section title="Food And Drinks">
          <ObjectArrayEditor<EventFoodItem>
            items={draft.food ?? []}
            onChange={(food) => patchDraft({ food })}
            addLabel="Food item"
            emptyText="No food listed yet."
            getTitle={(item) => item.title || 'Food item'}
            createItem={(items) => ({
              id: makeStableIdFromLabel('food', 'new food', existingIds(items)),
              title: 'New food',
              category: 'Other',
            })}
            fields={[
              { key: 'title', label: 'Title', required: true },
              { key: 'category', label: 'Category', required: true },
              { key: 'quantity', label: 'Quantity' },
              { key: 'assignedTo', label: 'Assigned to' },
              { key: 'notes', label: 'Notes', kind: 'textarea' },
            ] as FieldConfig<EventFoodItem>[]}
          />
        </Section>
      )}

      {(draft.kind === 'event' || (draft.copyBlocks?.length ?? 0) > 0) && (
        <Section title="Copyable Messages">
          <ObjectArrayEditor<CopyBlock>
            items={draft.copyBlocks ?? []}
            onChange={(copyBlocks) => patchDraft({ copyBlocks })}
            addLabel="Message"
            emptyText="No copyable messages yet."
            getTitle={(item) => item.title || 'Message'}
            createItem={(items) => ({
              id: makeStableIdFromLabel('msg', 'new message', existingIds(items)),
              title: 'New message',
              body: '',
            })}
            fields={[
              { key: 'title', label: 'Title', required: true },
              { key: 'body', label: 'Body', kind: 'textarea', required: true },
            ] as FieldConfig<CopyBlock>[]}
          />
        </Section>
      )}

      <Section title="Budget">
        <ObjectArrayEditor<BudgetItem>
          items={draft.budget}
          onChange={(budget) => patchDraft({ budget })}
          addLabel="Budget item"
          emptyText="No budget items yet."
          getTitle={(item) => item.name || 'Budget item'}
          createItem={(items) => ({
            id: makeStableIdFromLabel('b', 'new cost', existingIds(items)),
            name: 'New cost',
            total: 0,
            splitCount: 1,
            status: 'tbd',
          })}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'total', label: 'Total', kind: 'number', required: true },
            { key: 'splitCount', label: 'Split count', kind: 'number', required: true },
            { key: 'status', label: 'Status', kind: 'select', options: BUDGET_STATUS_OPTIONS },
            { key: 'notes', label: 'Notes', kind: 'textarea' },
          ] as FieldConfig<BudgetItem>[]}
        />
      </Section>

      <Section title="Map">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput
            label="Embed URL"
            value={draft.map?.embedUrl}
            onChange={(value) => patchDraft({ map: { ...(draft.map ?? {}), embedUrl: value || undefined } })}
          />
          <TextInput
            label="Center latitude"
            type="number"
            value={draft.map?.center?.lat}
            onChange={(value) => patchDraft({ map: { ...(draft.map ?? {}), center: { lat: Number(value || 0), lng: draft.map?.center?.lng ?? 0 } } })}
          />
          <TextInput
            label="Center longitude"
            type="number"
            value={draft.map?.center?.lng}
            onChange={(value) => patchDraft({ map: { ...(draft.map ?? {}), center: { lat: draft.map?.center?.lat ?? 0, lng: Number(value || 0) } } })}
          />
        </div>
        <button type="button" className={COMPACT_BUTTON} onClick={() => patchDraft({ map: undefined })}>
          Clear map
        </button>
      </Section>

      {history.length > 0 && (
        <Section title="History">
          <ul className="divide-y divide-slate-100">
            {history.map((row) => (
              <li key={row.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Version {row.version}</p>
                  <p className="text-sm text-slate-500">
                    {row.updated_by ?? 'owner'} - {formatTimeAgo(row.updated_at)}
                    {row.restored_from_version ? ` - restored from v${row.restored_from_version}` : ''}
                  </p>
                </div>
                <button type="button" className={COMPACT_BUTTON} onClick={() => handleRestore(row.version)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="sticky bottom-[76px] z-40 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {dirty ? 'Unsaved edits' : 'No unsaved edits'}
            {validationErrors.length ? ` - ${validationErrors.length} validation issue${validationErrors.length === 1 ? '' : 's'}` : ''}
          </p>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saveState === 'saving' ? 'Saving...' : 'Save live'}
          </button>
        </div>
      </div>
    </form>
  )
}
