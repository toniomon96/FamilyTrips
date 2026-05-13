import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { listTrips } from '../data/trips'
import TripCard from '../components/TripCard'
import EmptyState from '../components/EmptyState'
import { useAllTripsProgress } from '../hooks/useAllTripsProgress'
import { useTripsWithOverrides } from '../hooks/useTripOverrides'

export default function TripsIndex() {
  const seedTrips = useMemo(() => listTrips(), [])
  const { trips, status } = useTripsWithOverrides(seedTrips)
  const progress = useAllTripsProgress(trips)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-slate-300"
      >
        Skip to content
      </a>
      <main id="main" className="mx-auto max-w-xl px-4 pt-8 pb-10 space-y-6">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Our trips</h1>
              <p className="text-slate-600">Upcoming first. Tap a trip to open it.</p>
            </div>
            <Link
              to="/trips/new"
              className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm active:scale-[0.98]"
            >
              Add trip
            </Link>
          </div>
        </header>

        {(status === 'error' || status === 'offline') && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Live trip list is {status === 'offline' ? 'offline' : 'unavailable'} right now. Saved direct
            links still open when Supabase is connected.
          </div>
        )}

        {trips.length === 0 ? (
          <EmptyState icon="🧳" title="No trips yet" body="Use Add trip to start the first shared plan." />
        ) : (
          <nav aria-label="Trips">
            <ul className="space-y-4">
              {trips.map((trip) => (
                <li key={trip.slug}>
                  <TripCard trip={trip} progress={progress.get(trip.slug)} />
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </div>
  )
}
