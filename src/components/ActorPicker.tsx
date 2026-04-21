import type { Person } from '../types/trip'

type Props = {
  people: Person[]
  selectedActorId: string | null
  onPick: (actorId: string) => void
  title?: string
  subtitle?: string
}

export default function ActorPicker({
  people,
  selectedActorId,
  onPick,
  title = 'Who’s using this device?',
  subtitle = 'So we can show who ticked off what. You can switch later.',
}: Props) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {people.map((p) => {
          const isSelected = p.id === selectedActorId
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className={`w-full text-left rounded-2xl border px-3 py-2 transition active:scale-[0.98] ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="block font-medium text-sm">{p.name}</span>
                {p.role && (
                  <span
                    className={`block text-xs ${
                      isSelected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {p.role}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
