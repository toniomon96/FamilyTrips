import { Outlet, useParams } from 'react-router-dom'
import BottomNav from './BottomNav'
import { TripProvider } from '../context/TripContext'

function LayoutInner() {
  const { tripSlug } = useParams<{ tripSlug?: string }>()
  const basePath = tripSlug ? `/${tripSlug}` : ''

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-slate-300"
      >
        Skip to content
      </a>
      <main id="main" className="mx-auto max-w-xl px-4 pt-6 pb-28">
        <Outlet />
      </main>
      <BottomNav basePath={basePath} />
    </div>
  )
}

export default function Layout() {
  return (
    <TripProvider>
      <LayoutInner />
    </TripProvider>
  )
}
