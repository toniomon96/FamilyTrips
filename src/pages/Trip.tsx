import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import {
  formatDay,
  formatItinerary,
  formatLongDate,
  mapsLink,
} from '../utils/formatters'

export default function Trip() {
  const trip = useTrip()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Trip</h1>
        <p className="text-slate-600">Day-by-day plan and things to do.</p>
      </header>

      <nav aria-label="On this page" className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <a href="#itinerary" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-medium">🗓️ Itinerary</a>
        <a href="#things" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-medium">📍 Things to do</a>
      </nav>

      <Section
        id="itinerary"
        title="Itinerary"
        icon="🗓️"
        copyText={trip.itinerary.length ? formatItinerary(trip) : undefined}
        copyLabel="Copy full itinerary"
      >
        {trip.itinerary.length === 0 && (
          <EmptyState icon="🗓️" title="Itinerary TBD" body="Day-by-day plans will appear here as they’re locked in." />
        )}
        <div className="space-y-4">
          {trip.itinerary.map((day) => (
            <article key={day.date} className="rounded-2xl border border-slate-200 overflow-hidden">
              <header className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-100">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{formatLongDate(day.date)}</p>
                  {day.title && <h3 className="font-semibold text-slate-900">{day.title}</h3>}
                </div>
                <CopyButton text={formatDay(day)} label="Copy day" />
              </header>
              <ul className="divide-y divide-slate-100">
                {day.items.map((item, i) => (
                  <li key={i} className="px-4 py-3 flex gap-4">
                    {item.time && <span className="text-slate-500 font-mono text-sm w-20 shrink-0">{item.time}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      {item.address && (
                        <a
                          href={mapsLink(item.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 underline decoration-slate-200 underline-offset-2 break-words"
                        >
                          {item.address}
                        </a>
                      )}
                      {item.notes && <p className="text-sm text-slate-600 mt-1">{item.notes}</p>}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 underline underline-offset-2 break-all"
                        >
                          {item.link}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section id="things" title="Things to do" icon="📍">
        {trip.thingsToDo.length === 0 && (
          <EmptyState icon="📍" title="Nothing listed yet" body="Ideas go here once we start picking activities." />
        )}
        <ul className="space-y-3">
          {trip.thingsToDo.map((a) => (
            <li key={a.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{a.name}</p>
                  {a.category && <p className="text-xs text-slate-500">{a.category}</p>}
                  {a.notes && <p className="text-sm text-slate-700 mt-1">{a.notes}</p>}
                  {a.address && (
                    <a
                      href={mapsLink(a.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 underline underline-offset-2 break-words mt-1 inline-block"
                    >
                      {a.address}
                    </a>
                  )}
                  {a.url && (
                    <div>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-700 underline underline-offset-2 break-all"
                      >
                        {a.url}
                      </a>
                    </div>
                  )}
                </div>
                <CopyButton
                  text={[a.name, a.category, a.address, a.url, a.notes].filter(Boolean).join('\n')}
                  label="Copy"
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
