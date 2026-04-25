import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import {
  formatCopyBlocks,
  formatDay,
  formatEventFoodList,
  formatItinerary,
  formatLongDate,
  mapsLink,
} from '../utils/formatters'

export default function Trip() {
  const trip = useTrip()
  const isEvent = trip.kind === 'event'
  const scheduleLabel = isEvent ? 'Schedule' : 'Itinerary'
  const thingsLabel = isEvent ? 'Ideas' : 'Things to do'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{isEvent ? 'Schedule' : 'Trip'}</h1>
        <p className="text-slate-600">
          {isEvent ? 'The plan for the gathering.' : 'Day-by-day plan and things to do.'}
        </p>
      </header>

      <nav aria-label="On this page" className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <a href="#itinerary" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-medium">🗓️ {scheduleLabel}</a>
        {trip.food?.length ? (
          <a href="#food" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-medium">🍽️ Food</a>
        ) : null}
        {trip.copyBlocks?.length ? (
          <a href="#messages" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-medium">📋 Messages</a>
        ) : null}
        <a href="#things" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-medium">📍 {thingsLabel}</a>
      </nav>

      <Section
        id="itinerary"
        title={scheduleLabel}
        icon="🗓️"
        copyText={trip.itinerary.length ? formatItinerary(trip) : undefined}
        copyLabel={isEvent ? 'Copy schedule' : 'Copy full itinerary'}
      >
        {trip.itinerary.length === 0 && (
          <EmptyState
            icon="🗓️"
            title={isEvent ? 'Schedule TBD' : 'Itinerary TBD'}
            body={isEvent ? 'The day-of plan will appear here as it gets set.' : 'Day-by-day plans will appear here as they’re locked in.'}
          />
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

      {trip.food && trip.food.length > 0 && (
        <Section
          id="food"
          title="Food & Drinks"
          icon="🍽️"
          copyText={formatEventFoodList(trip.food, `${trip.name} Food & Drinks`)}
          copyLabel="Copy food list"
        >
          <ul className="space-y-3">
            {trip.food.map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.category}</p>
                    {(item.quantity || item.assignedTo || item.notes) && (
                      <p className="text-sm text-slate-700 mt-1">
                        {[item.quantity, item.assignedTo ? `From ${item.assignedTo}` : null, item.notes]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <CopyButton
                    text={[item.title, item.quantity, item.assignedTo, item.notes].filter(Boolean).join('\n')}
                    label="Copy"
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {trip.copyBlocks && trip.copyBlocks.length > 0 && (
        <Section
          id="messages"
          title="Copyable Messages"
          icon="📋"
          copyText={formatCopyBlocks(trip.copyBlocks)}
          copyLabel="Copy all"
        >
          <ul className="space-y-3">
            {trip.copyBlocks.map((block) => (
              <li key={block.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{block.title}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line mt-1">{block.body}</p>
                  </div>
                  <CopyButton text={block.body} label="Copy" />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="things" title={thingsLabel} icon="📍">
        {trip.thingsToDo.length === 0 && (
          <EmptyState icon="📍" title="Nothing listed yet" body={isEvent ? 'Ideas and nearby notes can go here if they matter.' : 'Ideas go here once we start picking activities.'} />
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
