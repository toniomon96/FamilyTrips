import { listTripsSorted } from '../data/trips'
import TripCard from '../components/TripCard'
import EmptyState from '../components/EmptyState'

export default function TripsIndex() {
  const trips = listTripsSorted()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-slate-300"
      >
        Skip to content
      </a>
      <main id="main" className="mx-auto max-w-xl px-4 pt-8 pb-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Our trips</h1>
          <p className="text-slate-600">Upcoming first. Tap a trip to open it.</p>
        </header>

        {trips.length === 0 ? (
          <EmptyState icon="🧳" title="No trips yet" body="Add a trip file under src/data/trips/ to get started." />
        ) : (
          <ul className="space-y-4">
            {trips.map((trip) => (
              <li key={trip.slug}>
                <TripCard trip={trip} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
