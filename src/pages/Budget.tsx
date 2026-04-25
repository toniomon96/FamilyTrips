import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import EmptyState from '../components/EmptyState'
import {
  budgetAmount,
  budgetShare,
  formatBudget,
  formatBudgetAmount,
  formatBudgetShare,
  formatMoney,
  formatSplitCount,
  isBudgetTbd,
} from '../utils/formatters'

export default function Budget() {
  const trip = useTrip()
  const items = trip.budget
  const currency = trip.currency

  const grandTotal = items.reduce((s, i) => s + budgetAmount(i), 0)
  const perPersonTotal = items.reduce((s, i) => s + budgetShare(i), 0)
  const hasTbd = items.some(isBudgetTbd)
  const hasKnownItems = items.some((item) => !isBudgetTbd(item))

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
        <p className="text-blue-100 text-sm uppercase tracking-wide">
          {hasTbd && hasKnownItems ? 'Known trip cost' : 'Total trip cost'}
        </p>
        <p className="text-4xl font-bold mt-1">
          {hasKnownItems ? formatMoney(grandTotal, currency) : 'TBD'}
        </p>
        {hasTbd && (
          <p className="text-blue-100 text-sm mt-1">
            {hasKnownItems ? 'Some line items are still TBD.' : 'Line items are still TBD.'}
          </p>
        )}
        <p className="text-blue-100 text-sm mt-3">Your share</p>
        <p className="text-2xl font-semibold">
          {hasKnownItems ? formatMoney(Math.round(perPersonTotal), currency) : 'TBD'}
        </p>
      </div>

      <Section
        title="Breakdown"
        icon="💰"
        copyText={items.length ? formatBudget(items, currency) : undefined}
        copyLabel="Copy full budget"
      >
        {items.length === 0 && (
          <EmptyState icon="💰" title="Budget TBD" body="Line items and per-person splits will appear here as they’re set." />
        )}
        <ul className="divide-y divide-slate-100">
          {items.map((b) => {
            return (
              <li key={b.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-sm text-slate-500">Split {formatSplitCount(b.splitCount)}</p>
                  {b.notes && <p className="text-sm text-slate-600 mt-1">{b.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatBudgetAmount(b, currency)}</p>
                  <p className="text-sm text-slate-500">{formatBudgetShare(b, currency)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
