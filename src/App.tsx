import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Trip = lazy(() => import('./pages/Trip'))
const Stay = lazy(() => import('./pages/Stay'))
const People = lazy(() => import('./pages/People'))
const Checklist = lazy(() => import('./pages/Checklist'))
const Budget = lazy(() => import('./pages/Budget'))
const Packing = lazy(() => import('./pages/Packing'))
const ManageTrip = lazy(() => import('./pages/ManageTrip'))
const TripsIndex = lazy(() => import('./pages/TripsIndex'))
const MothersDay2026 = lazy(() => import('./pages/MothersDay2026'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center p-6">
      <p className="text-sm">Loading...</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<TripsIndex />} />
          <Route path="/mothers-day-2026" element={<MothersDay2026 />} />
          <Route path="/:tripSlug" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="trip" element={<Trip />} />
            <Route path="stay" element={<Stay />} />
            <Route path="people" element={<People />} />
            <Route path="checklist" element={<Checklist />} />
            <Route path="packing" element={<Packing />} />
            <Route path="budget" element={<Budget />} />
            <Route path="manage" element={<ManageTrip />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
