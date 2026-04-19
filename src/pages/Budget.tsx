import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import { formatBudget, formatMoney } from '../utils/formatters'

export default function Budget() {
  const trip = useTrip()
  const items = trip.budget
  const currency = trip.currency

  const grandTotal = items.reduce((s, i) => s + i.total, 0)
  const perPersonTotal = items.reduce((s, i) => s + i.total / i.splitCount, 0)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Budget</h1>
        <p className="text-slate-600">Shared trip expenses, read-only.</p>
        <p className="text-sm text-slate-500">
          Paid-for and owed-to conversations happen in the group chat — this is just the canonical numbers.
        </p>
      </header>

      <div className="rounded-3xl bg-blue-600 text-white p-6 text-center shadow-sm">
        <p className="text-blue-100 text-sm uppercase tracking-wide">Total trip cost</p>
        <p className="text-4xl font-bold mt-1">{formatMoney(grandTotal, currency)}</p>
        <p className="text-blue-100 text-sm mt-3">Your share</p>
        <p className="text-2xl font-semibold">{formatMoney(Math.round(perPersonTotal), currency)}</p>
      </div>

      <Section
        title="Breakdown"
        icon="💰"
        copyText={formatBudget(items, currency)}
        copyLabel="Copy full budget"
      >
        <ul className="divide-y divide-slate-100">
          {items.map((b) => {
            const share = b.total / b.splitCount
            return (
              <li key={b.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-sm text-slate-500">Split {b.splitCount} ways</p>
                  {b.notes && <p className="text-sm text-slate-600 mt-1">{b.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatMoney(b.total, currency)}</p>
                  <p className="text-sm text-slate-500">{formatMoney(Math.round(share), currency)}/person</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
