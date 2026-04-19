import { Link, useParams } from 'react-router-dom'
import { useTrip } from '../context/tripContextCore'
import CopyButton from '../components/CopyButton'
import {
  daysUntil,
  formatDateRange,
  formatDay,
  formatLongDate,
  formatTripOverview,
} from '../utils/formatters'

function todaysDay(trip: ReturnType<typeof useTrip>) {
  const today = new Date().toISOString().slice(0, 10)
  return trip.itinerary.find((d) => d.date === today)
}

export default function Home() {
  const trip = useTrip()
  const { tripSlug } = useParams<{ tripSlug?: string }>()
  const basePath = tripSlug ? `/${tripSlug}` : ''
  const left = daysUntil(trip.startDate)
  const tripStarted = left <= 0
  const tripEnded = daysUntil(trip.endDate) < 0
  const today = todaysDay(trip)

  const quickLinks: { to: string; label: string; icon: string; hint: string }[] = [
    { to: 'trip', label: 'Itinerary', icon: '🗓️', hint: 'Day-by-day plan' },
    { to: 'stay', label: 'Stay & Bookings', icon: '🛏️', hint: 'Address, Wi-Fi, flights' },
    { to: 'people', label: 'People', icon: '👪', hint: 'Who’s coming' },
    { to: 'checklist', label: 'Checklist', icon: '✅', hint: 'What’s done, what’s not' },
    { to: 'budget', label: 'Budget', icon: '💰', hint: 'Costs & per-person split' },
  ]

  return (
    <div className="space-y-6">
      {trip.heroImage && (
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200">
          <img src={trip.heroImage} alt="" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h1 className="text-2xl font-bold leading-tight">{trip.name}</h1>
            <p className="text-white/90">📍 {trip.location}</p>
            <p className="text-white/80 text-sm">{formatDateRange(trip.startDate, trip.endDate)}</p>
          </div>
        </div>
      )}

      {!trip.heroImage && (
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">{trip.name}</h1>
          <p className="text-slate-600 text-lg">📍 {trip.location}</p>
          <p className="text-slate-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
        </div>
      )}

      <div className="rounded-3xl bg-blue-600 text-white p-6 text-center shadow-sm">
        {tripEnded ? (
          <p className="text-3xl font-semibold">Trip wrapped 🎉</p>
        ) : tripStarted ? (
          <>
            <p className="text-blue-100 text-sm uppercase tracking-wide">Happening now</p>
            <p className="text-4xl font-bold mt-1">We’re here!</p>
          </>
        ) : (
          <>
            <p className="text-blue-100 text-sm uppercase tracking-wide">Trip starts in</p>
            <p className="text-6xl font-bold leading-none mt-2">{left}</p>
            <p className="text-blue-100 mt-1">day{left === 1 ? '' : 's'}</p>
          </>
        )}
      </div>

      {today && (
        <section className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
              <h2 className="text-lg font-semibold">{today.title ?? formatLongDate(today.date)}</h2>
            </div>
            <CopyButton text={formatDay(today)} label="Copy today" />
          </div>
          <ul className="space-y-2">
            {today.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                {item.time && <span className="text-slate-500 font-mono text-sm w-20 shrink-0">{item.time}</span>}
                <span className="text-slate-800">{item.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickLinks.map((q) => (
          <Link
            key={q.to}
            to={`${basePath}/${q.to}`.replace(/\/+/g, '/')}
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition"
          >
            <span aria-hidden className="text-3xl">{q.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-slate-900">{q.label}</span>
              <span className="block text-sm text-slate-500">{q.hint}</span>
            </span>
            <span aria-hidden className="text-slate-400 text-xl">›</span>
          </Link>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <CopyButton text={formatTripOverview(trip)} label="Share trip summary" size="md" />
      </div>
    </div>
  )
}
