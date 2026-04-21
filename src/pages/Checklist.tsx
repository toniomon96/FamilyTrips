import { useMemo } from 'react'
import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import { formatChecklist } from '../utils/formatters'
import type { ChecklistItem } from '../types/trip'
import { useChecklistState, type ChecklistStatus } from '../hooks/useChecklistState'

const CATEGORY_ICONS: Record<string, string> = {
  Flights: '✈️',
  Stay: '🏠',
  Transport: '🚗',
  Tickets: '🎟️',
  Food: '🍕',
  Wedding: '💒',
  Birthday: '🎂',
  Baby: '👶',
  Dogs: '🐶',
  Admin: '📋',
}

function StatusChip({ status }: { status: ChecklistStatus }) {
  if (status === 'online') return null
  const classes: Record<Exclude<ChecklistStatus, 'online'>, string> = {
    saving: 'bg-blue-50 text-blue-700 border-blue-200',
    offline: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }
  const label: Record<Exclude<ChecklistStatus, 'online'>, string> = {
    saving: 'Saving…',
    offline: 'Offline · changes won’t sync',
    error: 'Couldn’t save · try again',
  }
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classes[status]}`}
      role="status"
    >
      {label[status]}
    </span>
  )
}

export default function Checklist() {
  const trip = useTrip()
  const { dbRows, status, toggle } = useChecklistState(trip.slug)

  const mergedItems: ChecklistItem[] = useMemo(
    () =>
      trip.checklist.map((it) => {
        const row = dbRows.get(it.id)
        return row ? { ...it, done: row.done } : it
      }),
    [trip.checklist, dbRows],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const it of mergedItems) {
      const list = map.get(it.category) ?? []
      list.push(it)
      map.set(it.category, list)
    }
    return [...map.entries()]
  }, [mergedItems])

  const done = mergedItems.filter((i) => i.done).length
  const total = mergedItems.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Checklist</h1>
        <p className="text-slate-600">
          Live trip prep — {done} of {total} done ({pct}%).
        </p>
        <p className="text-sm text-slate-500">
          Tap any item to toggle it. Changes sync to everyone viewing the trip.
        </p>
      </header>

      {total > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">Overall progress</span>
            <div className="flex items-center gap-2">
              <StatusChip status={status} />
              <span className="font-semibold">{pct}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {total === 0 && (
        <EmptyState
          icon="✅"
          title="No checklist yet"
          body="Trip prep items will show up here once they’re added."
        />
      )}

      {grouped.map(([cat, list]) => (
        <Section
          key={cat}
          title={cat}
          icon={CATEGORY_ICONS[cat] ?? '📋'}
          copyText={formatChecklist(list)}
          copyLabel="Copy section"
        >
          <ul className="divide-y divide-slate-100">
            {list.map((it) => (
              <li key={it.id} className="py-3 flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={it.done}
                  aria-label={`Mark "${it.title}" ${it.done ? 'incomplete' : 'complete'}`}
                  onClick={() => toggle(it.id, !it.done)}
                  className={`flex-shrink-0 mt-0.5 w-7 h-7 -m-0.5 p-0.5 rounded-full flex items-center justify-center text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 active:scale-95 ${
                    it.done
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-slate-100 text-slate-400 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {it.done ? '✓' : ''}
                </button>
                <div className="min-w-0">
                  <p className={it.done ? 'text-slate-500 line-through' : 'text-slate-900'}>
                    {it.title}
                  </p>
                  {it.notes && <p className="text-sm text-slate-600 mt-0.5">{it.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {total > 0 && (
        <div className="flex justify-center">
          <CopyButton
            text={formatChecklist(mergedItems)}
            label="Copy full checklist"
            size="md"
          />
        </div>
      )}
    </div>
  )
}
