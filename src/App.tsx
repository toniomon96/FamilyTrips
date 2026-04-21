import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Trip from './pages/Trip'
import Stay from './pages/Stay'
import People from './pages/People'
import Checklist from './pages/Checklist'
import Budget from './pages/Budget'
import TripsIndex from './pages/TripsIndex'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripsIndex />} />
        <Route path="/:tripSlug" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="trip" element={<Trip />} />
          <Route path="stay" element={<Stay />} />
          <Route path="people" element={<People />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="budget" element={<Budget />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
