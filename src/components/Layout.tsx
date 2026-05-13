import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import BottomNav from './BottomNav'
import { trips } from '../data/trips'
import { TripContext } from '../context/tripContextCore'
import { useResolvedTrip, useTripWithOverride } from '../hooks/useTripOverrides'

function TripRouteStatus({ status }: { status: 'loading' | 'error' }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-sm rounded-3xl bg-white border border-slate-200 p-5 text-center shadow-sm space-y-3">
        <p className="text-3xl" aria-hidden>
          {status === 'loading' ? '🧳' : '⚠️'}
        </p>
        <h1 className="text-xl font-semibold">
          {status === 'loading' ? 'Loading trip...' : 'Trip unavailable'}
        </h1>
        {status === 'error' && (
          <p className="text-sm text-slate-600">
            Dynamic trips need Supabase to be configured and reachable.
          </p>
        )}
        {status === 'error' && (
          <Link to="/" className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Back to trips
          </Link>
        )}
      </div>
    </div>
  )
}

export default function Layout() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const seedTrip = tripSlug ? trips[tripSlug] : undefined
  const staticResult = useTripWithOverride(seedTrip)
  const dynamicResult = useResolvedTrip(seedTrip ? undefined : tripSlug)
  const trip = seedTrip ? staticResult.trip : dynamicResult.trip
  const status = seedTrip ? staticResult.status : dynamicResult.status

  if (!tripSlug) return <Navigate to="/" replace />
  if (!trip && (status === 'loading' || status === 'offline')) return <TripRouteStatus status="loading" />
  if (!trip && status === 'error') return <TripRouteStatus status="error" />
  if (!trip) return <Navigate to="/" replace />

  const basePath = `/${trip.slug}`

  return (
    <TripContext.Provider value={trip}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-slate-300"
        >
          Skip to content
        </a>
        <main id="main" className="mx-auto max-w-xl px-4 pt-4 pb-28">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3"
          >
            <span aria-hidden>←</span>
            <span>All trips</span>
          </Link>
          <Outlet />
        </main>
        <BottomNav basePath={basePath} kind={trip.kind} />
      </div>
    </TripContext.Provider>
  )
}
