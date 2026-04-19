import { INITIAL_COSTS } from '../data/initialData'

export default function Costs() {
  const costs = INITIAL_COSTS
  const grandTotal = costs.reduce((sum, c) => sum + c.total, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Cost Tracker</h1>
        <p className="text-zinc-400 text-sm">Shared trip expenses</p>
      </div>

      {/* Total */}
      <div className="bg-blue-600 rounded-2xl p-6 text-center shadow-lg">
        <p className="text-blue-200 text-sm mb-1">Total Trip Cost</p>
        <p className="text-4xl font-bold text-white">€{grandTotal.toLocaleString()}</p>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-3">
        <h2 className="text-zinc-400 text-sm uppercase tracking-wide">Breakdown</h2>
        {costs.map((cost) => {
          const perPerson = cost.total / cost.splitCount
          return (
            <div key={cost.name} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{cost.name}</p>
                  <p className="text-zinc-500 text-sm mt-0.5">Split {cost.splitCount} ways</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">€{cost.total.toLocaleString()}</p>
                  <p className="text-zinc-400 text-sm">€{perPerson.toFixed(0)}/person</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Per person summary */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <h2 className="text-zinc-400 text-sm mb-3">Per Person Summary</h2>
        {costs.map((cost) => {
          const perPerson = cost.total / cost.splitCount
          return (
            <div key={cost.name} className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-400 text-sm">{cost.name}</span>
              <span className="text-white text-sm font-medium">€{perPerson.toFixed(0)}</span>
            </div>
          )
        })}
        <div className="flex justify-between pt-3 mt-1">
          <span className="text-white font-bold">Your total</span>
          <span className="text-blue-400 font-bold text-lg">
            €{costs.reduce((sum, c) => sum + c.total / c.splitCount, 0).toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  )
}
