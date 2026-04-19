import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Checklist from './pages/Checklist'
import Polls from './pages/Polls'
import Costs from './pages/Costs'
import Info from './pages/Info'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="polls" element={<Polls />} />
          <Route path="costs" element={<Costs />} />
          <Route path="info" element={<Info />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
