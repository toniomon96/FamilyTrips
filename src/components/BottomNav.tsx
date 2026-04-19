import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/checklist', label: 'Checklist', icon: '✅' },
  { to: '/polls', label: 'Polls', icon: '🗳️' },
  { to: '/info', label: 'Info', icon: 'ℹ️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 text-xs gap-1 transition-colors ${
              isActive ? 'text-blue-400' : 'text-zinc-500'
            }`
          }
        >
          <span className="text-xl">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
