import { Link } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
import { mothersDay2026 } from '../data/trips/mothers-day-2026'
import { formatDay, formatEventFoodList, formatItinerary, mapsLink } from '../utils/formatters'
import type { ChecklistItem, EventFoodItem, PackingItem } from '../types/trip'

type Status = 'done' | 'todo' | 'watch'

type TrackerRow = {
  item: string
  status: Status
  notes: string
}

type Question = {
  prompt: string
  detail: string
}

const giftRows: TrackerRow[] = [
  { item: "Mom's gift", status: 'done', notes: 'Bought. Wrap by Saturday.' },
  { item: "Morgan's gift", status: 'done', notes: "Bought. Tatum's birthstone. Give Sunday morning with Tatum present." },
  { item: "Mom's flowers", status: 'todo', notes: 'Order online for Saturday May 9 delivery.' },
  { item: "Morgan's flowers", status: 'todo', notes: 'Order online for Saturday May 9 delivery or Sunday AM surprise.' },
  { item: 'Card for Mom', status: 'todo', notes: 'Buy, write, and stage with wrapped gift.' },
  { item: 'Card for Morgan', status: 'todo', notes: 'From Toni + Tatum.' },
]

const choreGroups: { title: string; items: ChecklistItem[] }[] = [
  {
    title: 'By Friday night',
    items: mothersDay2026.eventTasks?.filter((item) => item.category === 'Friday chores') ?? [],
  },
  {
    title: 'Saturday',
    items: mothersDay2026.eventTasks?.filter((item) => item.category === 'Saturday chores' || item.category === 'Saturday prep') ?? [],
  },
  {
    title: 'Sunday AM',
    items: mothersDay2026.eventTasks?.filter((item) => item.category === 'Sunday AM setup') ?? [],
  },
]

const openQuestions: Question[] = [
  {
    prompt: 'Time for The Common Table brunch?',
    detail: 'Confirm the reservation, party size, and whether Tatum is coming.',
  },
  {
    prompt: 'Any guests beyond immediate family for the cookout?',
    detail: 'Current headcount is 5 adults + Tatum, with room to invite a few more.',
  },
  {
    prompt: 'What games do Morgan and Mom actually want?',
    detail: 'Let them pick, then stage only those games Sunday morning.',
  },
]

const masterPrep = [
  'Order flowers online for Mom and Morgan, deliver Saturday May 9.',
  'Confirm The Common Table brunch reservation and exact time.',
  'By Friday night, knock out chores so Morgan is not carrying the house reset.',
  'Saturday morning, grocery run for cookout supplies.',
  'Saturday night, make banana pudding, wrap both gifts, and write cards.',
  'Sunday AM, set yard, grill, music, games, and do the birthstone reveal with Tatum.',
  'Sunday 2:00 PM, cookout starts.',
]

function byCategory<T extends { category: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return [...groups.entries()]
}

function statusLabel(status: Status) {
  if (status === 'done') return 'Bought'
  if (status === 'watch') return 'Watch'
  return 'TODO'
}

function statusClasses(status: Status) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (status === 'watch') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-rose-100 text-rose-800 border-rose-200'
}

function FoodColumn({ title, items }: { title: string; items: EventFoodItem[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-white/85">
            <span className="font-medium text-white">{item.title}</span>
            {item.notes ? <span className="block text-white/65">{item.notes}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SupplyGroup({ title, items }: { title: string; items: PackingItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm text-slate-700">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <span className="font-medium text-slate-900">{item.title}</span>
              {item.quantity ? <span className="text-slate-500"> - {item.quantity}</span> : null}
              {item.notes ? <span className="block text-slate-500">{item.notes}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function MothersDay2026() {
  const trip = mothersDay2026
  const saturday = trip.itinerary[0]
  const sunday = trip.itinerary[1]
  const foodGroups = byCategory(trip.food ?? [])
  const supplyGroups = byCategory(trip.supplies ?? [])
  const giftCopy = giftRows.map((row) => `${statusLabel(row.status)} - ${row.item}: ${row.notes}`).join('\n')
  const choresCopy = choreGroups
    .map((group) => `${group.title}\n${group.items.map((item) => `☐ ${item.title}`).join('\n')}`)
    .join('\n\n')

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-slate-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:border focus:border-slate-300"
      >
        Skip to content
      </a>

      <main id="main" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-5 rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-sm sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <Link to="/" className="inline-flex text-sm font-medium text-slate-600 hover:text-slate-950">
              ← All trips
            </Link>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">May 9-10, 2026 · McKinney, TX</p>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-6xl">
                Mother's Day weekend command center
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                A relaxed two-day plan honoring Mom and Morgan. The operating principle is simple:
                protect Morgan's chill, keep the cookout as the only production, and stay fully present.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#timeline"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                View weekend flow
              </a>
              <a
                href="#cookout"
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400"
              >
                Cookout prep
              </a>
              <CopyButton
                text={formatItinerary(trip)}
                label="Copy plan"
                className="border-slate-300"
              />
            </div>
          </div>

          <aside className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-200">My job this weekend</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/85">
              <li>Handle logistics, cooking, and chores so Morgan gets real rest.</li>
              <li>Take Tatum duty so Morgan has hands-free downtime.</li>
              <li>No Hub, app building, agent prompts, or engineering work.</li>
            </ul>
          </aside>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ['Base plan', 'Low-pressure family weekend'],
            ['Cookout', 'Sunday · 2:00 PM'],
            ['Headcount', '5 adults + Tatum'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </section>

        <section id="timeline" className="mt-8 scroll-mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Soft itinerary</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Loose by design</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Times flex. The point is to flow, not to schedule.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[saturday, sunday].map((day) => (
              <article key={day.date} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{day.date}</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-950">{day.title}</h3>
                  </div>
                  <CopyButton text={formatDay(day)} label="Copy day" />
                </div>
                <ol className="mt-5 space-y-4">
                  {day.items.map((item) => (
                    <li key={`${day.date}-${item.time}-${item.title}`} className="grid grid-cols-[5.5rem_1fr] gap-3">
                      <span className="text-sm font-mono text-slate-500">{item.time}</span>
                      <span>
                        <span className="block font-semibold text-slate-950">{item.title}</span>
                        {item.notes ? <span className="block text-sm leading-6 text-slate-600">{item.notes}</span> : null}
                        {item.address ? (
                          <a
                            href={mapsLink(item.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-sm font-medium text-blue-700 underline underline-offset-2"
                          >
                            {item.address}
                          </a>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section id="cookout" className="mt-8 scroll-mt-6 overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
          <div className="grid gap-6 p-5 text-white sm:p-7 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">Sunday host mode</p>
              <h2 className="text-3xl font-bold tracking-tight">Cookout command center</h2>
              <p className="text-white/75 leading-7">
                Our house · 109 Genovese Dr, McKinney, TX 75071. Start time is 2:00 PM.
                Family hangs out, eats, and plays whatever games the moms pick.
              </p>
              <a
                href={mapsLink(trip.stay.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Open address
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {foodGroups.map(([category, items]) => (
                <FoodColumn key={category} title={category} items={items} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Shopping list</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Cookout food and supplies</h2>
            </div>
            <CopyButton
              text={formatEventFoodList(trip.food ?? [], "Mother's Day cookout food")}
              label="Copy food"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {supplyGroups.map(([category, items]) => (
              <SupplyGroup key={category} title={category} items={items} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Gifts & flowers</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">Lock these early</h2>
              </div>
              <CopyButton text={giftCopy} label="Copy" />
            </div>
            <ul className="mt-5 divide-y divide-slate-100">
              {giftRows.map((row) => (
                <li key={row.item} className="grid gap-3 py-3 sm:grid-cols-[8rem_1fr]">
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-950">{row.item}</span>
                    <span className="block text-sm leading-6 text-slate-600">{row.notes}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-950">
              Order flowers ASAP. Mother's Day is the highest-volume floral week of the year,
              and delivery slots fill in the final 7 days.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Chores</p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">Front-load the reset</h2>
              </div>
              <CopyButton text={choresCopy} label="Copy" />
            </div>
            <div className="mt-5 space-y-4">
              {choreGroups.map((group) => (
                <section key={group.title} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-950">{group.title}</h3>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex gap-2 text-sm text-slate-700">
                        <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs text-slate-400">
                          ✓
                        </span>
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Master prep order</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">What happens next</h2>
            <ol className="mt-5 space-y-3">
              {masterPrep.map((item, index) => (
                <li key={item} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-slate-700">{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Open questions</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Decisions to close</h2>
              <ul className="mt-5 space-y-3">
                {openQuestions.map((question) => (
                  <li key={question.prompt} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">{question.prompt}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{question.detail}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[1.5rem] bg-emerald-900 p-5 text-white shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">Weekend boundary</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Phone down, present up</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                No Hub work. No app building. No agent prompts. No engineering.
                Phone away when possible. Fully present for Morgan, Tatum, and the family.
              </p>
            </section>
          </div>
        </section>

        <footer className="py-8 text-center text-sm text-slate-500">
          <Link to="/mothers-day-2026/trip" className="font-medium text-blue-700 underline underline-offset-2">
            Open the standard planner view
          </Link>
        </footer>
      </main>
    </div>
  )
}
