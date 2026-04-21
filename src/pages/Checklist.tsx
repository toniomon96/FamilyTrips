import { useMemo } from 'react'
import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import { formatChecklist } from '../utils/formatters'
import type { ChecklistItem } from '../types/trip'

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

export default function Checklist() {
  const trip = useTrip()
  const items = trip.checklist

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const it of items) {
      const list = map.get(it.category) ?? []
      list.push(it)
      map.set(it.category, list)
    }
    return [...map.entries()]
  }, [items])

  const done = items.filter((i) => i.done).length
  const total = items.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Checklist</h1>
        <p className="text-slate-600">
          Static snapshot of trip prep — {done} of {total} done ({pct}%).
        </p>
        <p className="text-sm text-slate-500">
          Maintained by the organizer. Latest status shows up here when the site is updated.
        </p>
      </header>

      {total > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Overall progress</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {total === 0 && (
        <EmptyState icon="✅" title="No checklist yet" body="Trip prep items will show up here once they’re added." />
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
                <span
                  aria-hidden
                  className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    it.done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 border border-slate-300'
                  }`}
                >
                  {it.done ? '✓' : ''}
                </span>
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
          <CopyButton text={formatChecklist(items)} label="Copy full checklist" size="md" />
        </div>
      )}
    </div>
  )
}
