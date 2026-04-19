import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import { formatPeople, formatPerson } from '../utils/formatters'

function telHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

export default function People() {
  const trip = useTrip()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">People</h1>
        <p className="text-slate-600">Who’s coming and who to call.</p>
      </header>

      <Section
        title="Who’s coming"
        icon="👪"
        copyText={formatPeople(trip)}
        copyLabel="Copy everyone"
      >
        <ul className="divide-y divide-slate-100">
          {trip.people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{p.name}</p>
                {p.role && <p className="text-sm text-slate-500">{p.role}</p>}
                {p.phone && (
                  <a href={telHref(p.phone)} className="text-blue-700 underline underline-offset-2 break-all">
                    {p.phone}
                  </a>
                )}
              </div>
              <CopyButton text={formatPerson(p)} label="Copy" />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Important contacts" icon="☎️">
        <ul className="divide-y divide-slate-100">
          {trip.contacts.map((c) => {
            const href =
              c.kind === 'url' ? c.value :
              c.kind === 'text' ? undefined :
              telHref(c.value)
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{c.label}</p>
                  {href ? (
                    <a
                      href={href}
                      target={c.kind === 'url' ? '_blank' : undefined}
                      rel={c.kind === 'url' ? 'noopener noreferrer' : undefined}
                      className="text-blue-700 underline underline-offset-2 break-all"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <span className="text-slate-800">{c.value}</span>
                  )}
                  {c.notes && <p className="text-sm text-slate-600 mt-1">{c.notes}</p>}
                </div>
                <CopyButton text={`${c.label}: ${c.value}`} label="Copy" />
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
