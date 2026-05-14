import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
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
  PlanItemStatus,
  PlanKind,
  PlannerMiniPlan,
  PlannerRecommendationCandidate,
  PlannerSourceRef,
  Stay,
  Trip,
} from '../types/trip'
import { formatTimeAgo } from '../utils/formatters'
import { dateRangeError, isDateWithinRange, isIsoDate, isValidDateRange } from '../utils/dateValidation'
import {
  cloneTrip,
  editableFieldsFromTrip,
  makeStableIdFromLabel,
  validateEditableTrip,
  type TripOverrideData,
  type TripOverrideHistoryRow,
  type TripOverrideRow,
} from '../utils/tripOverrides'
import type { SmartAssistAction, SmartAssistPreview, SmartAssistSectionId } from '../utils/tripAssist'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type FieldKind = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'url' | 'tel'
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
  min?: string | number
  max?: string | number
  step?: string | number
}

type OwnerApiSuccess = {
  ok: true
  row?: TripOverrideRow
  history?: TripOverrideHistoryRow[]
  mergedTrip?: Trip
  assist?: SmartAssistPreview
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
  if (kind === 'number') {
    if (raw.trim() === '') return required ? 0 : undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : required ? 0 : undefined
  }
  if (!required && raw.trim() === '') return undefined
  return raw
}

function parseFiniteNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  min,
  max,
  step,
  error,
}: {
  label: string
  value: string | number | undefined
  onChange: (value: string) => void
  type?: 'text' | 'date' | 'number' | 'url' | 'tel'
  placeholder?: string
  required?: boolean
  min?: string | number
  max?: string | number
  step?: string | number
  error?: string | null
}) {
  const generatedId = useId()
  const inputId = `input-${generatedId}`
  const errorId = `${inputId}-error`
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        id={inputId}
        type={type}
        required={required}
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CLASS}
      />
      {error && <span id={errorId} className="text-xs font-medium text-red-700">{error}</span>}
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
      type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : kind === 'url' ? 'url' : kind === 'tel' ? 'tel' : 'text'}
      value={fieldValue(record[field.key])}
      placeholder={field.placeholder}
      required={field.required}
      min={field.min}
      max={field.max}
      step={field.step}
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
  endDate,
  onChange,
}: {
  days: Day[]
  startDate: string
  endDate: string
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
              <TextInput
                label="Date"
                type="date"
                min={isIsoDate(startDate) ? startDate : undefined}
                max={isIsoDate(endDate) ? endDate : undefined}
                value={day.date}
                error={isValidDateRange(startDate, endDate) && !isDateWithinRange(day.date, startDate, endDate) ? 'Day date must stay within the trip date range.' : null}
                onChange={(value) => updateDay(dayIndex, { ...day, date: value })}
              />
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
                      <TextInput label="Link" type="url" value={item.link} onChange={(value) => updateDay(dayIndex, updateItem(day, itemIndex, { ...item, link: value || undefined }))} />
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

type CommandPanel =
  | 'overview'
  | 'itinerary'
  | 'mustDos'
  | 'bookings'
  | 'tasks'
  | 'budget'
  | 'share'
  | 'sources'
  | 'assist'
  | 'advanced'

type MiniPlan = {
  id: string
  title: string
  category?: string
  status?: PlanItemStatus
  why?: string
  nextStep?: string
  notes?: string
  link?: string
  sourceIds?: string[]
  recommendedDate?: string
  recommendedTimeWindow?: string
  logisticsNote?: string
  packingImplication?: string
  confidence?: string
}

const COMMAND_PANEL_LABELS: Record<CommandPanel, { trip: string; event: string }> = {
  overview: { trip: 'Overview', event: 'Overview' },
  itinerary: { trip: 'Itinerary', event: 'Run of show' },
  mustDos: { trip: 'Must-dos', event: 'Moments' },
  bookings: { trip: 'Bookings', event: 'Event tasks' },
  tasks: { trip: 'Checklist/Packing', event: 'Supplies' },
  budget: { trip: 'Budget', event: 'Budget' },
  share: { trip: 'Share', event: 'Share' },
  sources: { trip: 'Sources', event: 'Sources' },
  assist: { trip: 'Smart Assist', event: 'Smart Assist' },
  advanced: { trip: 'Advanced Editor', event: 'Advanced Editor' },
}

const COMMAND_PANEL_ORDER: CommandPanel[] = [
  'overview',
  'itinerary',
  'mustDos',
  'bookings',
  'tasks',
  'budget',
  'share',
  'sources',
  'assist',
  'advanced',
]

function classNames(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}

function statusLabel(status?: string): string {
  if (!status) return 'suggested'
  return status.replace(/-/g, ' ')
}

function statusTone(status?: PlanItemStatus): string {
  if (status === 'confirmed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'needs-booking') return 'border-rose-200 bg-rose-50 text-rose-800'
  if (status === 'needs-confirmation') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function strengthTone(strength?: string): string {
  if (strength === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (strength === 'weak') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-blue-200 bg-blue-50 text-blue-900'
}

function commandPanelsForKind(isEvent: boolean): { id: CommandPanel; label: string }[] {
  return COMMAND_PANEL_ORDER.map((id) => ({
    id,
    label: isEvent ? COMMAND_PANEL_LABELS[id].event : COMMAND_PANEL_LABELS[id].trip,
  }))
}

function sourceModeLabel(mode?: NonNullable<Trip['planner']>['sourceMode']): string {
  if (mode === 'search') return 'Researched with sources'
  if (mode === 'ai') return 'AI-assisted'
  if (mode === 'ai-fallback') return 'Fallback draft'
  if (mode === 'curated') return 'Curated pack'
  if (mode === 'deterministic') return 'Deterministic fallback'
  return 'Source mode not recorded'
}

function StatusBadge({ status }: { status?: PlanItemStatus }) {
  return (
    <span className={classNames('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize', statusTone(status))}>
      {statusLabel(status)}
    </span>
  )
}

function needsAction(status?: PlanItemStatus): boolean {
  return status === 'needs-booking' || status === 'needs-confirmation'
}

function CommandTabs({
  activePanel,
  onChange,
  isEvent,
}: {
  activePanel: CommandPanel
  onChange: (panel: CommandPanel) => void
  isEvent: boolean
}) {
  const panels = commandPanelsForKind(isEvent)

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={isEvent ? 'Event workspace sections' : 'Trip workspace sections'}>
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            role="tab"
            aria-selected={activePanel === panel.id}
            onClick={() => onChange(panel.id)}
            className={classNames(
              'min-h-11 shrink-0 rounded-2xl px-3 py-2 text-sm font-semibold transition',
              activePanel === panel.id
                ? 'bg-slate-950 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100',
            )}
          >
            {panel.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>}
    </div>
  )
}

function getSources(sourceIds: string[] | undefined, sourceRefs: PlannerSourceRef[]): PlannerSourceRef[] {
  if (!sourceIds?.length) return []
  const ids = new Set(sourceIds)
  return sourceRefs.filter((source) => ids.has(source.id))
}

function joinNotes(...parts: (string | undefined)[]): string | undefined {
  const note = parts.filter(Boolean).join(' ')
  return note || undefined
}

function MiniPlanCard({ plan, sourceRefs }: { plan: MiniPlan; sourceRefs: PlannerSourceRef[] }) {
  const sources = getSources(plan.sourceIds, sourceRefs)
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {plan.category && <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{plan.category}</p>}
          <h3 className="mt-1 text-base font-bold text-slate-950">{plan.title}</h3>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      {plan.why && <p className="mt-3 text-sm leading-6 text-slate-700">{plan.why}</p>}
      {(plan.recommendedDate || plan.recommendedTimeWindow || plan.confidence) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          {plan.recommendedDate && <span className="rounded-full bg-slate-50 px-2 py-1">Date: {plan.recommendedDate}</span>}
          {plan.recommendedTimeWindow && <span className="rounded-full bg-slate-50 px-2 py-1">Window: {plan.recommendedTimeWindow}</span>}
          {plan.confidence && <span className="rounded-full bg-slate-50 px-2 py-1">Confidence: {plan.confidence}</span>}
        </div>
      )}
      {plan.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{plan.notes}</p>}
      {plan.logisticsNote && <p className="mt-2 text-sm leading-6 text-slate-600">{plan.logisticsNote}</p>}
      {plan.packingImplication && (
        <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-800">Packing: </span>{plan.packingImplication}</p>
      )}
      {plan.nextStep && (
        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Next step: </span>
          {plan.nextStep}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {plan.link && (
          <a href={plan.link} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
            Open link
          </a>
        )}
        {sources.map((source) => (
          source.url ? (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
              Source
            </a>
          ) : null
        ))}
      </div>
    </article>
  )
}

function RecommendationCard({ recommendation, sourceRefs }: { recommendation: PlannerRecommendationCandidate; sourceRefs: PlannerSourceRef[] }) {
  const sources = getSources(recommendation.sourceIds, sourceRefs)
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{recommendation.category}</p>
          <h3 className="mt-1 text-sm font-bold text-slate-950">{recommendation.name}</h3>
        </div>
        <StatusBadge status={recommendation.bookingStatus ?? recommendation.status} />
      </div>
      {recommendation.addressOrArea && <p className="mt-1 text-xs text-slate-500">{recommendation.addressOrArea}</p>}
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{recommendation.whyItFits}</p>
      {recommendation.nextStep && <p className="mt-2 line-clamp-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700"><span className="font-semibold">Next: </span>{recommendation.nextStep}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {recommendation.bestFor.slice(0, 2).map((fit) => <span key={fit} className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{fit}</span>)}
        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{recommendation.confidence} confidence</span>
        {sources.map((source) => source.url ? (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
            Source
          </a>
        ) : null)}
      </div>
    </article>
  )
}

function buildMiniPlans(trip: Trip): MiniPlan[] {
  const plans = new Map<string, MiniPlan>()
  const add = (plan: MiniPlan) => {
    const key = plan.title.toLowerCase()
    const current = plans.get(key)
    plans.set(key, {
      ...plan,
      status: current?.status === 'needs-booking' ? current.status : plan.status ?? current?.status,
      why: plan.why ?? current?.why,
      nextStep: plan.nextStep ?? current?.nextStep,
      notes: plan.notes ?? current?.notes,
      sourceIds: plan.sourceIds ?? current?.sourceIds,
      link: plan.link ?? current?.link,
      recommendedDate: plan.recommendedDate ?? current?.recommendedDate,
      recommendedTimeWindow: plan.recommendedTimeWindow ?? current?.recommendedTimeWindow,
      logisticsNote: plan.logisticsNote ?? current?.logisticsNote,
      packingImplication: plan.packingImplication ?? current?.packingImplication,
      confidence: plan.confidence ?? current?.confidence,
    })
  }

  for (const miniPlan of trip.planner?.miniPlans ?? []) {
    const typedMiniPlan = miniPlan as PlannerMiniPlan
    add({
      id: typedMiniPlan.id,
      title: typedMiniPlan.title,
      category: typedMiniPlan.type ?? 'Must-do',
      status: typedMiniPlan.status,
      why: typedMiniPlan.why,
      nextStep: typedMiniPlan.nextStep,
      notes: joinNotes(
        typedMiniPlan.recommendedDate ? `Suggested date: ${typedMiniPlan.recommendedDate}.` : undefined,
        typedMiniPlan.recommendedTimeWindow ? `Window: ${typedMiniPlan.recommendedTimeWindow}.` : undefined,
      ),
      sourceIds: typedMiniPlan.sourceIds,
      recommendedDate: typedMiniPlan.recommendedDate,
      recommendedTimeWindow: typedMiniPlan.recommendedTimeWindow,
      logisticsNote: typedMiniPlan.logisticsNote,
      packingImplication: typedMiniPlan.packingImplication,
      confidence: typedMiniPlan.confidence,
    })
  }

  for (const activity of trip.thingsToDo) {
    add({
      id: `activity-${activity.id}`,
      title: activity.name,
      category: activity.category ?? 'Idea',
      status: activity.status,
      why: activity.why,
      nextStep: activity.nextStep,
      notes: activity.notes,
      link: activity.url,
      sourceIds: activity.sourceIds,
    })
  }

  for (const booking of trip.bookings) {
    add({
      id: `booking-${booking.id}`,
      title: booking.title,
      category: booking.kind,
      status: booking.status,
      why: booking.why,
      nextStep: booking.nextStep,
      notes: booking.details,
      link: booking.link,
      sourceIds: booking.sourceIds,
    })
  }

  for (const day of trip.itinerary) {
    for (const [index, item] of day.items.entries()) {
      if (!item.status || item.status === 'suggested') continue
      add({
        id: `itinerary-${day.date}-${index}`,
        title: item.title,
        category: day.title ?? day.date,
        status: item.status,
        why: item.why,
        nextStep: item.nextStep,
        notes: item.notes,
        link: item.link,
        sourceIds: item.sourceIds,
      })
    }
  }

  return Array.from(plans.values()).sort((a, b) => {
    const priority = { 'needs-booking': 0, 'needs-confirmation': 1, confirmed: 2, suggested: 3 }
    return (priority[a.status ?? 'suggested'] ?? 3) - (priority[b.status ?? 'suggested'] ?? 3)
  })
}

function TripCommandPanel({
  trip,
  activePanel,
  onCopyTripLink,
}: {
  trip: Trip
  activePanel: Exclude<CommandPanel, 'advanced' | 'assist'>
  onCopyTripLink: () => void
}) {
  const isEvent = trip.kind === 'event'
  const planner = trip.planner
  const sourceRefs = trip.planner?.sourceRefs ?? []
  const recommendations = trip.planner?.recommendations ?? []
  const savedBrief = trip.planner?.brief
  const miniPlans = buildMiniPlans(trip)
  const actionItems = [
    ...trip.bookings.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.kind,
      status: item.status,
      nextStep: item.nextStep,
      notes: item.details,
    })),
    ...(isEvent ? trip.eventTasks ?? [] : trip.checklist).map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      nextStep: item.nextStep,
      notes: item.notes,
    })),
  ].filter((item) => needsAction(item.status))

  if (activePanel === 'overview') {
    return (
      <section className="space-y-4" role="tabpanel">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Days" value={trip.itinerary.length} note={isEvent ? 'Run-of-show blocks' : 'Calendar days'} />
          <MetricCard label={isEvent ? 'Tasks' : 'Bookings'} value={isEvent ? trip.eventTasks?.length ?? 0 : trip.bookings.length} note="Needs review" />
          <MetricCard label={isEvent ? 'Supplies' : 'Packing'} value={isEvent ? trip.supplies?.length ?? 0 : trip.packing?.length ?? 0} note={planner ? 'Generated list' : 'Current list'} />
          <MetricCard label="Sources" value={sourceRefs.length} note={planner ? sourceModeLabel(planner.sourceMode) : 'No generated source notes yet'} />
        </div>

        {planner ? (
          <div className={classNames('rounded-3xl border p-5 shadow-sm', strengthTone(planner.draftStrength))}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">Draft confidence</p>
                <h2 className="mt-1 text-2xl font-bold capitalize">{planner.draftStrength} draft</h2>
                <p className="mt-1 text-sm leading-6">{sourceModeLabel(planner.sourceMode)}. Confirm anything marked booking-sensitive before relying on exact timing.</p>
              </div>
              <StatusBadge status={planner.draftStrength === 'strong' ? 'confirmed' : 'needs-confirmation'} />
            </div>
            {planner.missingInputs.length ? (
              <div className="mt-4">
                <p className="text-sm font-semibold">What would make this stronger</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {planner.missingInputs.map((item) => (
                    <span key={item} className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Plan status</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Hand-built plan</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This plan was curated manually or loaded from the original trip data. Use Smart Assist if you want generated improvements or source-backed additions.
                </p>
              </div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                manual
              </span>
            </div>
          </div>
        )}

        {savedBrief && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Based on this brief</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{savedBrief.stayName || savedBrief.venueName || savedBrief.destination}</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Location anchor</span>{savedBrief.stayAddress || savedBrief.venueAddress || savedBrief.locationText || savedBrief.destination}</p>
              <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Pace</span>{savedBrief.pace?.replace(/-/g, ' ') || 'Not specified'}</p>
              <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Travelers</span>{savedBrief.travelerNames?.join(', ') || savedBrief.travelers || savedBrief.guestCount || 'Not specified'}</p>
              <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs font-semibold text-slate-500">Must-dos</span>{savedBrief.mustDos?.length ?? 0}</p>
            </div>
            {savedBrief.rawContext && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{savedBrief.rawContext}</p>}
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Recommended places</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Restaurants, activities, and logistics surfaced from the brief.</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Top {Math.min(4, recommendations.length)} of {recommendations.length}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {recommendations.slice(0, 4).map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} sourceRefs={sourceRefs} />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{isEvent ? 'Next event actions' : 'Next best actions'}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{isEvent ? 'Confirm, assign, then share.' : 'Book, confirm, then share.'}</h2>
            <div className="mt-4 space-y-3">
              {actionItems.slice(0, 6).map((item) => (
                <article key={`${item.category}-${item.id}`} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.nextStep && <p className="mt-1 text-sm text-slate-600">{item.nextStep}</p>}
                  {!item.nextStep && item.notes && <p className="mt-1 text-sm text-slate-600">{item.notes}</p>}
                </article>
              ))}
              {actionItems.length === 0 && (
                <p className="text-sm text-slate-600">
                  {isEvent ? 'No urgent event tasks or assignments are flagged right now.' : 'No urgent booking or confirmation items are flagged right now.'}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{isEvent ? 'Venue' : 'Home base'}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{trip.stay.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{trip.stay.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">{isEvent ? 'Starts' : 'Check-in'}</span>{trip.stay.checkIn}</p>
              <p className="rounded-2xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">{isEvent ? 'Ends' : 'Check-out'}</span>{trip.stay.checkOut}</p>
            </div>
            {trip.stay.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{trip.stay.notes}</p>}
          </section>
        </div>
      </section>
    )
  }

  if (activePanel === 'itinerary') {
    return (
      <section className="space-y-3" role="tabpanel">
        {trip.itinerary.map((day) => (
          <article key={day.date} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{day.date}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{day.title ?? 'Plan'}</h2>
            <div className="mt-4 space-y-3">
              {day.items.map((item, index) => (
                <div key={`${day.date}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.time && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{item.time}</span>}
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p>}
                  {item.nextStep && <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Next step:</span> {item.nextStep}</p>}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    )
  }

  if (activePanel === 'mustDos') {
    return (
      <section className="space-y-3" role="tabpanel">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{isEvent ? 'Moments' : 'Mini-plans'}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">{isEvent ? 'Must-have moments with next steps.' : 'Priority ideas with next steps.'}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isEvent
              ? 'These combine important moments, setup needs, and assignment reminders into action cards.'
              : 'These combine must-dos, source-backed ideas, and booking reminders into action cards.'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {miniPlans.slice(0, 16).map((plan) => <MiniPlanCard key={plan.id} plan={plan} sourceRefs={sourceRefs} />)}
          {miniPlans.length === 0 && (
            <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">
              {isEvent ? 'No must-have moments are listed yet.' : 'No must-do ideas are listed yet.'}
            </p>
          )}
        </div>
      </section>
    )
  }

  if (activePanel === 'bookings') {
    const bookingPanelItems: MiniPlan[] = isEvent
      ? (trip.eventTasks ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          status: item.status,
          why: item.why,
          nextStep: item.nextStep,
          notes: item.notes,
          sourceIds: item.sourceIds,
        }))
      : trip.bookings.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.kind,
          status: item.status,
          why: item.why,
          nextStep: item.nextStep,
          notes: item.details,
          link: item.link,
          sourceIds: item.sourceIds,
        }))
    return (
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2" role="tabpanel">
        {bookingPanelItems.map((item) => <MiniPlanCard key={item.id} sourceRefs={sourceRefs} plan={item} />)}
        {bookingPanelItems.length === 0 && (
          <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">
            {isEvent ? 'No event tasks are listed yet.' : 'No bookings are listed yet.'}
          </p>
        )}
      </section>
    )
  }

  if (activePanel === 'tasks') {
    const tasks = isEvent ? trip.eventTasks ?? [] : trip.checklist
    const packables = isEvent ? trip.supplies ?? trip.packing ?? [] : trip.packing ?? []
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="tabpanel">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">{isEvent ? 'Event tasks' : 'Checklist'}</h2>
          <div className="mt-4 space-y-2">
            {tasks.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <StatusBadge status={item.status} />
                </div>
                {item.notes && <p className="mt-1 text-sm text-slate-600">{item.notes}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">{isEvent ? 'Supplies' : 'Packing'}</h2>
          <div className="mt-4 space-y-2">
            {packables.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{item.category}</span>
                </div>
                {item.notes && <p className="mt-1 text-sm text-slate-600">{item.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (activePanel === 'budget') {
    return (
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2" role="tabpanel">
        {trip.budget.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.status ?? 'tbd'}</p>
                <h3 className="mt-1 font-bold text-slate-950">{item.name}</h3>
              </div>
              <p className="font-bold text-slate-950">{trip.currency}{item.total}</p>
            </div>
            {item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}
            {item.nextStep && <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Next step:</span> {item.nextStep}</p>}
          </article>
        ))}
      </section>
    )
  }

  if (activePanel === 'share') {
    return (
      <section className="space-y-3" role="tabpanel">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Share</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Send the plan without explaining the app.</h2>
          <button type="button" onClick={onCopyTripLink} className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Copy trip link
          </button>
        </div>
        {(trip.copyBlocks ?? []).map((block) => (
          <article key={block.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-950">{block.title}</h3>
                <StatusBadge status={block.status} />
              </div>
              <CopyButton text={block.body} label="Copy message" />
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{block.body}</pre>
          </article>
        ))}
      </section>
    )
  }

  return (
    <section className="space-y-3" role="tabpanel">
      <div className={classNames('rounded-3xl border p-5 shadow-sm', planner ? strengthTone(planner.draftStrength) : 'border-slate-200 bg-white text-slate-900')}>
        <p className="text-sm font-semibold uppercase tracking-wide">{planner ? 'Draft source and trust' : 'Source notes'}</p>
        <h2 className="mt-1 text-xl font-bold">{planner ? sourceModeLabel(planner.sourceMode) : 'No generated source notes yet'}</h2>
        {planner ? (
          planner.warnings.map((warning) => <p key={warning} className="mt-2 text-sm leading-6">{warning}</p>)
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This hand-built plan does not have AI research citations attached. Smart Assist can add generated notes later without replacing the original trip.
          </p>
        )}
      </div>
      {sourceRefs.map((source) => (
        <article key={source.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-slate-950">{source.title}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">{source.kind}</span>
          </div>
          {source.note && <p className="mt-2 text-sm text-slate-600">{source.note}</p>}
          {source.url && (
            <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
              Open source
            </a>
          )}
        </article>
      ))}
      {planner?.notes?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-slate-950">Planner notes</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {planner.notes.slice(0, 8).map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ) : null}
      {planner?.locationLimitations?.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
          <h3 className="font-bold">Location-awareness limits</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {planner.locationLimitations.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
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
  const [assistAction, setAssistAction] = useState<SmartAssistAction>('fill-missing')
  const [assistNote, setAssistNote] = useState('')
  const [assistPreview, setAssistPreview] = useState<SmartAssistPreview | null>(null)
  const [selectedAssistSections, setSelectedAssistSections] = useState<SmartAssistSectionId[]>([])
  const [activePanel, setActivePanel] = useState<CommandPanel>('overview')

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
  const dateIssue = dateRangeError(draft.startDate, draft.endDate)

  function patchDraft(patch: Partial<Trip>) {
    setDirty(true)
    setServerErrors([])
    setDraft((prev) => ({ ...prev, ...patch, slug: prev.slug }))
  }

  function patchStartDate(value: string) {
    const patch: Partial<Trip> = { startDate: value }
    if (isIsoDate(value) && isIsoDate(draft.endDate) && value > draft.endDate) patch.endDate = value
    patchDraft(patch)
  }

  function patchEndDate(value: string) {
    patchDraft({ endDate: value })
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
  const postCreateActions = useMemo(() => {
    const bookingCount = draft.kind === 'event'
      ? (draft.eventTasks ?? []).filter((item) => needsAction(item.status)).length
      : draft.bookings.filter((item) => needsAction(item.status)).length
    const mustDoCount = draft.planner?.miniPlans?.length ?? draft.thingsToDo.length
    const recommendationCount = draft.planner?.recommendations?.length ?? 0
    return [
      {
        title: draft.kind === 'event' ? 'Review the run of show' : 'Review itinerary flow',
        detail: draft.kind === 'event'
          ? `${draft.itinerary.length} day-of plan block${draft.itinerary.length === 1 ? '' : 's'} to scan before sharing.`
          : `${draft.itinerary.length} day${draft.itinerary.length === 1 ? '' : 's'} to scan for pacing and downtime.`,
        panel: 'itinerary' as CommandPanel,
      },
      {
        title: draft.kind === 'event' ? 'Confirm event tasks' : 'Book and confirm',
        detail: bookingCount > 0
          ? `${bookingCount} item${bookingCount === 1 ? '' : 's'} need booking or confirmation.`
          : 'No urgent booking or confirmation items are flagged yet.',
        panel: 'bookings' as CommandPanel,
      },
      {
        title: draft.kind === 'event' ? 'Check key moments' : 'Check must-do mini-plans',
        detail: mustDoCount > 0
          ? `${mustDoCount} priority item${mustDoCount === 1 ? '' : 's'} have next steps or should be reviewed.`
          : 'No must-dos are structured yet; Smart Assist can help if you add context.',
        panel: 'mustDos' as CommandPanel,
      },
      {
        title: 'Share the simple version',
        detail: recommendationCount > 0
          ? `${recommendationCount} recommendation${recommendationCount === 1 ? '' : 's'} are stored; copy the link or summary after review.`
          : 'Copy the link or summary after the first review pass.',
        panel: 'share' as CommandPanel,
      },
    ]
  }, [draft])
  const assistOptions = useMemo<SelectOption[]>(() => {
    if (draft.kind === 'event') {
      return [
        { value: 'fill-missing', label: 'Fill missing event sections' },
        { value: 'event-run-of-show', label: 'Improve event run of show' },
        { value: 'event-supplies', label: 'Build supplies / assignments' },
        { value: 'share-summary', label: 'Rewrite group-chat summary' },
        { value: 'packing-checklist', label: 'Build event tasks / supplies' },
        { value: 'logistics-notes', label: 'Add logistics notes' },
        { value: 'looser-day', label: 'Make the event looser' },
        { value: 'tighter-day', label: 'Tighten open blocks' },
      ]
    }
    return [
      { value: 'fill-missing', label: 'Fill missing sections' },
      { value: 'improve-itinerary', label: 'Improve itinerary' },
      { value: 'booking-reminders', label: 'Create booking reminders' },
      { value: 'packing-checklist', label: 'Build checklist / packing' },
      { value: 'improve-restaurants', label: 'Improve restaurants near stay' },
      { value: 'improve-activities', label: 'Improve activities near stay' },
      { value: 'must-do-mini-plans', label: 'Turn must-dos into mini-plans' },
      { value: 'share-summary', label: 'Rewrite group-chat summary' },
      { value: 'logistics-notes', label: 'Add logistics notes' },
      { value: 'looser-day', label: 'Make the plan looser' },
      { value: 'tighter-day', label: 'Tighten open days' },
    ]
  }, [draft.kind])

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

  async function handleSmartAssistPreview() {
    setSaveState('saving')
    setMessage(null)
    setServerErrors([])
    const result = await ownerRequest({
      action: 'assistPreview',
      tripSlug: draft.slug,
      pin,
      assistAction,
      note: assistNote,
    })
    if (!result.ok) {
      setSaveState('error')
      setMessage(result.error)
      setServerErrors(result.validationErrors ?? [])
      return
    }
    const assist = result.assist ?? null
    setAssistPreview(assist)
    setSelectedAssistSections(assist?.sections.map((section) => section.id) ?? [])
    setSaveState('idle')
    setMessage(result.assist?.summary.length ? 'Smart Assist preview ready.' : 'Smart Assist did not find a safe automatic change.')
  }

  async function handleApplySmartAssist() {
    if (!assistPreview) return
    if (selectedAssistSections.length === 0) {
      setSaveState('error')
      setMessage('Choose at least one preview section to apply.')
      return
    }
    const selectedSectionIds = new Set(selectedAssistSections)
    const selectedFields = new Set<keyof TripOverrideData>()
    for (const section of assistPreview.sections) {
      if (!selectedSectionIds.has(section.id)) continue
      for (const field of section.fields) selectedFields.add(field)
    }
    if (selectedFields.size === 0) {
      setSaveState('error')
      setMessage('The selected preview sections did not include any data changes.')
      return
    }
    const selectedData = editableFieldsFromTrip(draft) as TripOverrideData
    const previewData = assistPreview.data as Record<string, unknown>
    for (const field of selectedFields) {
      ;(selectedData as Record<string, unknown>)[field as string] = previewData[field as string]
    }
    setSaveState('saving')
    setMessage(null)
    setServerErrors([])
    const result = await ownerRequest({
      action: 'save',
      tripSlug: draft.slug,
      pin,
      data: selectedData,
      updatedBy: 'Smart Assist',
    })
    if (!result.ok) {
      setSaveState('error')
      setMessage(result.error)
      setServerErrors(result.validationErrors ?? [])
      return
    }
    replaceFromApi(result)
    setAssistPreview(null)
    setSelectedAssistSections([])
    setSaveState('saved')
    setMessage(`Smart Assist applied as version ${result.row?.version ?? ''}.`.trim())
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
                {postCreateActions.map((action) => (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => setActivePanel(action.panel)}
                    className="rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="block font-semibold text-slate-950">{action.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{action.detail}</span>
                  </button>
                ))}
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

      <CommandTabs activePanel={activePanel} onChange={setActivePanel} isEvent={draft.kind === 'event'} />

      {activePanel !== 'advanced' && allErrors.length > 0 && validationSummary(allErrors)}

      {activePanel !== 'advanced' && activePanel !== 'assist' && (
        <TripCommandPanel
          trip={draft}
          activePanel={activePanel}
          onCopyTripLink={handleCopyTripLink}
        />
      )}

      {activePanel === 'assist' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4" role="tabpanel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Smart Assist</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Improve this plan without starting over.</h2>
              <p className="mt-1 text-sm text-slate-600">
                Preview suggested edits, then apply them through the same save/history flow.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!pin.trim() || saveState === 'saving'}
              onClick={handleSmartAssistPreview}
            >
              {saveState === 'saving' ? 'Checking...' : 'Preview assist'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectInput
              label="Assist action"
              value={assistAction}
              onChange={(value) => {
                setAssistAction(value as SmartAssistAction)
                setAssistPreview(null)
                setSelectedAssistSections([])
              }}
              options={assistOptions}
            />
            <TextArea
              label="Optional instruction"
              value={assistNote}
              rows={3}
              placeholder="Example: make this more kid-friendly, add reminders for dinner reservations, keep mornings open..."
              onChange={setAssistNote}
            />
          </div>
          {assistPreview && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <div>
                <p className="font-semibold text-slate-950">Preview summary</p>
                {assistPreview.summary.length ? (
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {assistPreview.summary.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">No safe automatic changes were found.</p>
                )}
                {assistPreview.warnings.map((warning) => (
                  <p key={warning} className="mt-2 text-sm text-amber-800">{warning}</p>
                ))}
              </div>
              {assistPreview.sections.length > 0 ? (
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">Choose what to apply</p>
                      <p className="text-sm text-slate-600">Only selected sections will be saved live.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        onClick={() => setSelectedAssistSections(assistPreview.sections.map((section) => section.id))}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        onClick={() => setSelectedAssistSections([])}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {assistPreview.sections.map((section) => {
                      const selected = selectedAssistSections.includes(section.id)
                      return (
                        <label key={section.id} className="flex min-h-16 items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              setSelectedAssistSections((current) =>
                                event.target.checked
                                  ? Array.from(new Set([...current, section.id]))
                                  : current.filter((id) => id !== section.id),
                              )
                            }}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>
                            <span className="block font-semibold text-slate-950">{section.label}</span>
                            <span className="block text-xs leading-5 text-slate-600">{section.summary}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This preview did not produce section-level changes to apply.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={selectedAssistSections.length === 0}
                  onClick={handleApplySmartAssist}
                >
                  Apply selected and save live
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    setAssistPreview(null)
                    setSelectedAssistSections([])
                  }}
                >
                  Dismiss preview
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {activePanel === 'advanced' && (
        <>
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Advanced Editor</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Full live editor for detailed cleanup.</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              This is the powerful owner/admin workspace. Use the command center tabs for normal review, and use this section only when you need to edit the underlying trip data directly.
            </p>
          </section>

          {validationSummary(allErrors)}

      <Section title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="Trip name" value={draft.name} required onChange={(value) => patchDraft({ name: value })} />
          <TextInput label="Location" value={draft.location} required onChange={(value) => patchDraft({ location: value })} />
          <TextInput label="Start date" type="date" value={draft.startDate} required error={dateIssue} onChange={patchStartDate} />
          <TextInput label="End date" type="date" value={draft.endDate} required min={isIsoDate(draft.startDate) ? draft.startDate : undefined} error={dateIssue} onChange={patchEndDate} />
          <SelectInput label="Kind" value={draft.kind ?? ''} options={TRIP_KIND_OPTIONS} onChange={(value) => patchDraft({ kind: (value || undefined) as PlanKind | undefined })} />
          <SelectInput label="Visibility" value={draft.visibility ?? ''} options={VISIBILITY_OPTIONS} onChange={(value) => patchDraft({ visibility: (value || undefined) as Trip['visibility'] })} />
          <TextInput label="Currency" value={draft.currency} required onChange={(value) => patchDraft({ currency: value || '$' })} />
          <TextInput label="Hero image URL/path" type="url" value={draft.heroImage} onChange={(value) => patchDraft({ heroImage: value || undefined })} />
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
          <TextInput label="Booking link" type="url" value={draft.stay.bookingLink} onChange={(value) => patchStay({ bookingLink: value || undefined })} />
          <TextInput label="Confirmation" value={draft.stay.confirmation} onChange={(value) => patchStay({ confirmation: value || undefined })} />
          <TextInput label="Host name" value={draft.stay.hostName} onChange={(value) => patchStay({ hostName: value || undefined })} />
          <TextInput label="Host phone" type="tel" value={draft.stay.hostPhone} onChange={(value) => patchStay({ hostPhone: value || undefined })} />
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
            { key: 'when', label: 'Date', kind: 'date', min: draft.startDate, max: draft.endDate },
            { key: 'confirmation', label: 'Confirmation' },
            { key: 'link', label: 'Link', kind: 'url' },
            { key: 'details', label: 'Details', kind: 'textarea' },
          ] as FieldConfig<Booking>[]}
        />
      </Section>

      <Section title={draft.kind === 'event' ? 'Schedule' : 'Itinerary'}>
        <ItineraryEditor days={draft.itinerary} startDate={draft.startDate} endDate={draft.endDate} onChange={(itinerary) => patchDraft({ itinerary })} />
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
            { key: 'url', label: 'URL', kind: 'url' },
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
            { key: 'phone', label: 'Phone', kind: 'tel' },
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
            { key: 'total', label: 'Total', kind: 'number', required: true, min: 0, step: '0.01' },
            { key: 'splitCount', label: 'Split count', kind: 'number', required: true, min: 1, step: 1 },
            { key: 'status', label: 'Status', kind: 'select', options: BUDGET_STATUS_OPTIONS },
            { key: 'notes', label: 'Notes', kind: 'textarea' },
          ] as FieldConfig<BudgetItem>[]}
        />
      </Section>

      <Section title="Map">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput
            label="Embed URL"
            type="url"
            value={draft.map?.embedUrl}
            onChange={(value) => patchDraft({ map: { ...(draft.map ?? {}), embedUrl: value || undefined } })}
          />
          <TextInput
            label="Center latitude"
            type="number"
            min={-90}
            max={90}
            step="any"
            value={draft.map?.center?.lat}
            onChange={(value) => patchDraft({ map: { ...(draft.map ?? {}), center: { lat: parseFiniteNumber(value, draft.map?.center?.lat ?? 0), lng: draft.map?.center?.lng ?? 0 } } })}
          />
          <TextInput
            label="Center longitude"
            type="number"
            min={-180}
            max={180}
            step="any"
            value={draft.map?.center?.lng}
            onChange={(value) => patchDraft({ map: { ...(draft.map ?? {}), center: { lat: draft.map?.center?.lat ?? 0, lng: parseFiniteNumber(value, draft.map?.center?.lng ?? 0) } } })}
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
        </>
      )}
    </form>
  )
}
