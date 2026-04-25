import { useMemo, useState } from 'react'
import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import ActorPicker from '../components/ActorPicker'
import SyncStatusChip from '../components/SyncStatusChip'
import { formatChecklist, formatTimeAgo } from '../utils/formatters'
import type { ChecklistItem, Person } from '../types/trip'
import { useChecklistState } from '../hooks/useChecklistState'
import { useChecklistItems, type AddItemInput } from '../hooks/useChecklistItems'
import { useActor } from '../hooks/useActor'

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
  Other: '📝',
}

type MergedItem = ChecklistItem & {
  source: 'code' | 'db'
  updatedAt: string | null
  actorId: string | null
}

function ActorBadge({
  people,
  actorId,
  onSwitch,
}: {
  people: Person[]
  actorId: string | null
  onSwitch: () => void
}) {
  const actor = people.find((p) => p.id === actorId)
  if (!actor) return null
  return (
    <p className="text-sm text-slate-600">
      You’re checking items off as <span className="font-semibold text-slate-900">{actor.name}</span>
      {' · '}
      <button
        type="button"
        onClick={onSwitch}
        className="text-blue-700 underline underline-offset-2"
      >
        switch
      </button>
    </p>
  )
}

function firstNameFor(people: Person[], actorId: string | null): string | null {
  const actor = people.find((p) => p.id === actorId)
  if (!actor) return null
  return actor.name.split(' ')[0] || actor.name
}

type AddFormProps = {
  categories: string[]
  onSubmit: (input: AddItemInput) => Promise<void>
  onCancel: () => void
}

function AddItemForm({ categories, onSubmit, onCancel }: AddFormProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'Admin')
  const [categoryOther, setCategoryOther] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const showOther = category === '__other__'
  const canSave = title.trim().length > 0 && (!showOther || categoryOther.trim().length > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    await onSubmit({
      title,
      category: showOther ? categoryOther : category,
      notes,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Confirm rental car pickup time"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__other__">+ New category…</option>
          </select>
        </div>
        {showOther && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New category
            </label>
            <input
              type="text"
              value={categoryOther}
              onChange={(e) => setCategoryOther(e.target.value)}
              placeholder="e.g. Photography"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave || saving}
          className="px-4 py-1.5 text-sm font-medium rounded-full bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding…' : 'Add item'}
        </button>
      </div>
    </form>
  )
}

type EditFormProps = {
  item: MergedItem
  categories: string[]
  onSubmit: (patch: AddItemInput) => Promise<void>
  onCancel: () => void
}

function EditItemForm({ item, categories, onSubmit, onCancel }: EditFormProps) {
  const [title, setTitle] = useState(item.title)
  const [category, setCategory] = useState(
    categories.includes(item.category) ? item.category : '__other__',
  )
  const [categoryOther, setCategoryOther] = useState(
    categories.includes(item.category) ? '' : item.category,
  )
  const [notes, setNotes] = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)

  const showOther = category === '__other__'
  const canSave = title.trim().length > 0 && (!showOther || categoryOther.trim().length > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    await onSubmit({
      title,
      category: showOther ? categoryOther : category,
      notes,
    })
    setSaving(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3 mt-2"
    >
      <input
        type="text"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__other__">+ New category…</option>
        </select>
        {showOther && (
          <input
            type="text"
            value={categoryOther}
            onChange={(e) => setCategoryOther(e.target.value)}
            placeholder="New category"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave || saving}
          className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white disabled:bg-slate-300"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

export default function Checklist() {
  const trip = useTrip()
  const { actorId, setActor } = useActor(trip.slug)
  const { dbRows, status, toggle } = useChecklistState(trip.slug, actorId)
  const { items: dbItems, syncEnabled, addItem, updateItem, deleteItem } = useChecklistItems(
    trip.slug,
    actorId,
  )

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const mergedItems: MergedItem[] = useMemo(() => {
    const codeItems: MergedItem[] = trip.checklist.map((it) => {
      const row = dbRows.get(it.id)
      return {
        ...it,
        done: row ? row.done : it.done,
        source: 'code' as const,
        updatedAt: row?.updated_at ?? null,
        actorId: row?.actor_id ?? null,
      }
    })
    const userItems: MergedItem[] = dbItems.map((it) => {
      const row = dbRows.get(it.id)
      return {
        id: it.id,
        title: it.title,
        category: it.category,
        done: row?.done ?? false,
        notes: it.notes ?? undefined,
        source: 'db' as const,
        updatedAt: row?.updated_at ?? null,
        actorId: row?.actor_id ?? null,
      }
    })
    return [...codeItems, ...userItems]
  }, [trip.checklist, dbRows, dbItems])

  const grouped = useMemo(() => {
    const map = new Map<string, MergedItem[]>()
    for (const it of mergedItems) {
      const list = map.get(it.category) ?? []
      list.push(it)
      map.set(it.category, list)
    }
    return [...map.entries()]
  }, [mergedItems])

  const existingCategories = useMemo(() => {
    const set = new Set<string>()
    for (const it of mergedItems) set.add(it.category)
    return [...set]
  }, [mergedItems])

  const done = mergedItems.filter((i) => i.done).length
  const total = mergedItems.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const currentActorName = firstNameFor(trip.people, actorId)

  async function handleAddItem(input: AddItemInput): Promise<void> {
    const row = await addItem(input)
    if (row) setAdding(false)
  }

  async function handleEditItem(id: string, patch: AddItemInput): Promise<void> {
    await updateItem(id, patch)
    setEditingId(null)
  }

  async function handleDeleteItem(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete "${title}"?`)) return
    await deleteItem(id)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Checklist</h1>
        <p className="text-slate-600">
          Live trip prep — {done} of {total} done ({pct}%).
        </p>
        <p className="text-sm text-slate-500">
          Tap any item to toggle. {syncEnabled ? 'Changes sync to everyone viewing the trip.' : 'Changes stay in this browser session until Supabase is configured.'}
        </p>
        {actorId && !showPicker && (
          <ActorBadge
            people={trip.people}
            actorId={actorId}
            onSwitch={() => setShowPicker(true)}
          />
        )}
      </header>

      {(showPicker || !actorId) && (
        <ActorPicker
          people={trip.people}
          selectedActorId={actorId}
          onPick={(id) => {
            setActor(id)
            setShowPicker(false)
          }}
          title={actorId ? 'Switch user' : 'Who’s using this device?'}
        />
      )}

      {total > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">Overall progress</span>
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
          icon="✅"
          title="No checklist yet"
          body="Add your first item below — or items will show up here once they’re added in code."
        />
      )}

      {grouped.map(([cat, list]) => (
        <Section
          key={cat}
          title={cat}
          icon={CATEGORY_ICONS[cat] ?? '📝'}
          copyText={formatChecklist(list)}
          copyLabel="Copy section"
        >
          <ul className="divide-y divide-slate-100">
            {list.map((it) => {
              const actor = trip.people.find((p) => p.id === it.actorId)
              const actorFirstName = actor ? actor.name.split(' ')[0] : null
              const isEditing = editingId === it.id
              return (
                <li key={it.id} className="py-3">
                  <div className="flex items-start gap-3">
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
                    <div className="min-w-0 flex-1">
                      <p className={it.done ? 'text-slate-500 line-through' : 'text-slate-900'}>
                        {it.title}
                      </p>
                      {it.notes && (
                        <p className="text-sm text-slate-600 mt-0.5">{it.notes}</p>
                      )}
                      {it.done && (actorFirstName || it.updatedAt) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          ✓ {actorFirstName ?? 'Someone'}
                          {it.updatedAt ? ` · ${formatTimeAgo(it.updatedAt)}` : ''}
                        </p>
                      )}
                    </div>
                    {it.source === 'db' && !isEditing && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingId(it.id)}
                          className="text-slate-500 hover:text-slate-800"
                          aria-label={`Edit "${it.title}"`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(it.id, it.title)}
                          className="text-red-600 hover:text-red-800"
                          aria-label={`Delete "${it.title}"`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <EditItemForm
                      item={it}
                      categories={existingCategories}
                      onSubmit={(patch) => handleEditItem(it.id, patch)}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      ))}

      <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-900">Add an item</p>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
            >
              + New item
            </button>
          )}
        </div>
        {adding && (
          <AddItemForm
            categories={existingCategories.length ? existingCategories : ['Admin']}
            onSubmit={handleAddItem}
            onCancel={() => setAdding(false)}
          />
        )}
        {!adding && (
          <p className="text-sm text-slate-500">
            Anything else to track? Add it
            {syncEnabled
              ? ` and the whole family will see it sync live${currentActorName ? ` as ${currentActorName}` : ''}.`
              : ' for this browser session. It will not persist after a refresh until Supabase is configured.'}
          </p>
        )}
      </div>

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
