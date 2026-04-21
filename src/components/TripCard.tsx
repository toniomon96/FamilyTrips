import { Link } from 'react-router-dom'
import type { Trip } from '../types/trip'
import { daysUntil, formatDateRange } from '../utils/formatters'
import type { TripProgress } from '../hooks/useAllTripsProgress'

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-fuchsia-500 to-purple-600',
  'from-rose-500 to-red-600',
  'from-sky-500 to-cyan-600',
]

function gradientFor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function statusBadge(trip: Trip): { label: string; className: string } {
  const startIn = daysUntil(trip.startDate)
  const endIn = daysUntil(trip.endDate)
  if (endIn < 0) return { label: 'Wrapped', className: 'bg-slate-100 text-slate-600' }
  if (startIn <= 0) return { label: 'Happening now', className: 'bg-green-100 text-green-800' }
  if (startIn === 1) return { label: 'In 1 day', className: 'bg-blue-100 text-blue-800' }
  return { label: `In ${startIn} days`, className: 'bg-blue-100 text-blue-800' }
}

export default function TripCard({
  trip,
  progress,
}: {
  trip: Trip
  progress?: TripProgress
}) {
  const badge = statusBadge(trip)
  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : null

  return (
    <Link
      to={`/${trip.slug}`}
      className="block rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md active:scale-[0.99] transition"
    >
      {trip.heroImage ? (
        <div className="relative h-36">
          <img src={trip.heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div
          aria-hidden
          className={`h-36 bg-gradient-to-br ${gradientFor(trip.slug)} flex items-center justify-center px-4`}
        >
          <span className="text-white/95 text-3xl sm:text-4xl font-bold tracking-tight text-center line-clamp-2">
            {trip.location.split(',')[0]}
          </span>
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{trip.name}</h3>
            <p className="text-sm text-slate-600 truncate">📍 {trip.location}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <p className="text-sm text-slate-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
        {trip.tagline && <p className="text-sm text-slate-700">{trip.tagline}</p>}
        {progress && progress.total > 0 && pct !== null && (
          <div className="pt-1 space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {progress.done}/{progress.total} done ({pct}%)
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
