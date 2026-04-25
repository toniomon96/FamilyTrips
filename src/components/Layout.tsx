import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import BottomNav from './BottomNav'
import { trips } from '../data/trips'
import { TripContext } from '../context/tripContextCore'

export default function Layout() {
  const { tripSlug } = useParams<{ tripSlug: string }>()
  const trip = tripSlug ? trips[tripSlug] : undefined

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
