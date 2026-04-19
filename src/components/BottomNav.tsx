import { NavLink } from 'react-router-dom'

type Item = { to: string; label: string; icon: string; end?: boolean }

const items: Item[] = [
  { to: '', label: 'Home', icon: '🏠', end: true },
  { to: 'trip', label: 'Trip', icon: '🗓️' },
  { to: 'stay', label: 'Stay', icon: '🛏️' },
  { to: 'people', label: 'People', icon: '👪' },
]

export default function BottomNav({ basePath }: { basePath: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto max-w-xl flex">
        {items.map((item) => {
          const to = item.to ? `${basePath}/${item.to}`.replace(/\/+/g, '/') : basePath || '/'
          return (
            <li key={item.label} className="flex-1">
              <NavLink
                to={to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-3 min-h-[60px] text-xs font-medium transition-colors ${
                    isActive ? 'text-blue-700' : 'text-slate-600'
                  }`
                }
              >
                <span aria-hidden className="text-2xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
