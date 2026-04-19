import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="pb-20 max-w-lg mx-auto px-4 pt-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
