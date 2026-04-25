import { useMemo } from 'react'
import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import SyncStatusChip from '../components/SyncStatusChip'
import { formatPackingList } from '../utils/formatters'
import { packingStateKey, suppliesStateKey } from '../utils/packing'
import { useChecklistState } from '../hooks/useChecklistState'
import { useActor } from '../hooks/useActor'
import type { PackingItem } from '../types/trip'

const CATEGORY_ICONS: Record<string, string> = {
  'Travel docs': '🪪',
  Clothes: '👕',
  Toiletries: '🧴',
  Baby: '👶',
  'Beach / Pool': '🏖️',
  'Wedding / Event': '💒',
  Tech: '🔌',
  'Car / Road trip': '🚗',
  Dogs: '🐶',
  Food: '🍎',
  Golf: '⛳',
  Other: '🎒',
}

type MergedPackingItem = PackingItem & {
  packed: boolean
  stateKey: string
}

export default function Packing() {
  const trip = useTrip()
  const isEvent = trip.kind === 'event'
  const { actorId } = useActor(trip.slug)
  const { dbRows, status, toggle } = useChecklistState(trip.slug, actorId)

  const items = useMemo<MergedPackingItem[]>(
    () => {
      const packableItems = [
        ...(trip.packing ?? []).map((item) => ({ item, stateKey: packingStateKey(item.id) })),
        ...(trip.supplies ?? []).map((item) => ({ item, stateKey: suppliesStateKey(item.id) })),
      ]

      return packableItems.map(({ item, stateKey }) => {
        const row = dbRows.get(stateKey)
        return {
          ...item,
          packed: row ? row.done : item.packed ?? false,
          stateKey,
        }
      })
    },
    [trip.packing, trip.supplies, dbRows],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, MergedPackingItem[]>()
    for (const item of items) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()]
  }, [items])

  const packed = items.filter((item) => item.packed).length
  const total = items.length
  const pct = total ? Math.round((packed / total) * 100) : 0

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{isEvent ? 'Supplies' : 'Packing'}</h1>
        <p className="text-slate-600">
          {isEvent ? 'What to bring' : 'What to bring'} — {packed} of {total} packed ({pct}%).
        </p>
        <p className="text-sm text-slate-500">
          Tap any item as it goes in the bag. Supabase syncs when configured; otherwise changes stay in this browser session.
        </p>
      </header>

      {total > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">{isEvent ? 'Supply progress' : 'Packing progress'}</span>
            <div className="flex items-center gap-2">
              <SyncStatusChip status={status} />
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
          icon="🎒"
          title={isEvent ? 'Supply list TBD' : 'Packing list TBD'}
          body={isEvent ? 'Add supplies to this event file when the list is ready.' : 'Add packing items to this trip file when the list is ready.'}
        />
      )}

      {grouped.map(([cat, list]) => (
        <Section
          key={cat}
          title={cat}
          icon={CATEGORY_ICONS[cat] ?? '🎒'}
          copyText={formatPackingList(list, `${trip.name} ${isEvent ? 'Supplies' : 'Packing'}`)}
          copyLabel="Copy section"
        >
          <ul className="divide-y divide-slate-100">
            {list.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.packed}
                    aria-label={`Mark "${item.title}" ${item.packed ? 'unpacked' : 'packed'}`}
                    onClick={() => toggle(item.stateKey, !item.packed)}
                    className={`flex-shrink-0 mt-0.5 w-8 h-8 -m-0.5 p-0.5 rounded-full flex items-center justify-center text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 active:scale-95 ${
                      item.packed
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-slate-100 text-slate-400 border border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {item.packed ? '✓' : ''}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={item.packed ? 'text-slate-500 line-through' : 'text-slate-900'}>
                      {item.title}
                      {item.quantity && (
                        <span className="text-sm text-slate-500"> · {item.quantity}</span>
                      )}
                    </p>
                    {(item.assignedTo || item.notes) && (
                      <p className="text-sm text-slate-600 mt-0.5">
                        {[item.assignedTo ? `For ${item.assignedTo}` : null, item.notes]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {total > 0 && (
        <div className="flex justify-center">
          <CopyButton
            text={formatPackingList(items, `${trip.name} ${isEvent ? 'Supplies' : 'Packing'}`)}
            label={isEvent ? 'Copy full supply list' : 'Copy full packing list'}
            size="md"
          />
        </div>
      )}
    </div>
  )
}
