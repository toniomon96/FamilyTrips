import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import EmptyState from '../components/EmptyState'
import {
  budgetAmount,
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
  const hasTbd = items.some(isBudgetTbd)
  const hasEstimate = items.some((item) => item.status === 'estimate')
  const hasKnownItems = items.some((item) => !isBudgetTbd(item))

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Budget</h1>
        <p className="text-slate-600">Tracked shared expenses, read-only.</p>
        <p className="text-sm text-slate-500">
          Splits can vary by line item, so each cost shows its own share math.
        </p>
      </header>

      <div className="rounded-3xl bg-blue-600 text-white p-6 text-center shadow-sm">
        <p className="text-blue-100 text-sm uppercase tracking-wide">
          {hasEstimate ? 'Tracked total incl. estimates' : 'Tracked group total'}
        </p>
        <p className="text-4xl font-bold mt-1">
          {hasKnownItems ? formatMoney(grandTotal, currency) : 'TBD'}
        </p>
        {hasTbd && (
          <p className="text-blue-100 text-sm mt-1">
            {hasKnownItems ? 'Some line items are still TBD.' : 'Line items are still TBD.'}
          </p>
        )}
        {hasEstimate && (
          <p className="text-blue-100 text-sm mt-1">
            Confirmed costs and estimates are shown together below.
          </p>
        )}
      </div>

      <Section
        title="Breakdown"
        icon="💰"
        copyText={items.length ? formatBudget(items, currency) : undefined}
        copyLabel="Copy full budget"
      >
        {items.length === 0 && (
          <EmptyState icon="💰" title="Budget TBD" body="Line items and per-share splits will appear here as they’re set." />
        )}
        <ul className="divide-y divide-slate-100">
          {items.map((b) => {
            const tbd = isBudgetTbd(b)
            return (
              <li key={b.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-sm text-slate-500">
                    {tbd ? 'Optional / TBD' : `Split ${formatSplitCount(b.splitCount)}`}
                  </p>
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
