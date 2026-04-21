import { useTrip } from '../context/tripContextCore'
import Section from '../components/Section'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import { formatBooking, formatStay, mapsLink } from '../utils/formatters'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 sm:w-32 shrink-0">{label}</span>
      <span className="text-slate-900 break-words">{children}</span>
    </div>
  )
}

export default function Stay() {
  const trip = useTrip()
  const stay = trip.stay

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Stay & Bookings</h1>
        <p className="text-slate-600">Where we’re staying and every reservation in one place.</p>
      </header>

      <Section
        title="Where we’re staying"
        icon="🏠"
        copyText={formatStay(stay, trip)}
        copyLabel="Copy stay details"
      >
        <InfoRow label="Name">{stay.name}</InfoRow>
        <InfoRow label="Address">
          <a
            href={mapsLink(stay.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline underline-offset-2"
          >
            {stay.address}
          </a>
        </InfoRow>
        <InfoRow label="Check-in">{stay.checkIn}</InfoRow>
        <InfoRow label="Check-out">{stay.checkOut}</InfoRow>
        {stay.wifiSsid && (
          <InfoRow label="Wi-Fi">
            <span className="font-mono bg-slate-100 rounded px-2 py-0.5 inline-block">
              {stay.wifiSsid}
              {stay.wifiPassword ? ` / ${stay.wifiPassword}` : ''}
            </span>
          </InfoRow>
        )}
        {stay.hostName && (
          <InfoRow label="Host">
            {stay.hostName}
            {stay.hostPhone && (
              <>
                {' · '}
                <a href={`tel:${stay.hostPhone.replace(/\s+/g, '')}`} className="text-blue-700 underline underline-offset-2">
                  {stay.hostPhone}
                </a>
              </>
            )}
          </InfoRow>
        )}
        {stay.confirmation && <InfoRow label="Confirmation">{stay.confirmation}</InfoRow>}
        {stay.bookingLink && (
          <InfoRow label="Booking link">
            <a
              href={stay.bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline underline-offset-2 break-all"
            >
              View reservation →
            </a>
          </InfoRow>
        )}
        {stay.notes && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-3 text-sm">
            {stay.notes}
          </div>
        )}
      </Section>

      {stay.amenities.length > 0 && (
        <Section title="Amenities" icon="✨">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stay.amenities.map((a) => (
              <li key={a} className="flex items-center gap-2 text-slate-800">
                <span aria-hidden className="text-green-600">✓</span>
                {a}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Bookings" icon="🎟️">
        {trip.bookings.length === 0 && (
          <EmptyState icon="🎟️" title="No bookings yet" body="Flights, cars, and reservations will show up here." />
        )}
        <ul className="space-y-3">
          {trip.bookings.map((b) => {
            const icon =
              b.kind === 'flight' ? '✈️' :
              b.kind === 'car' ? '🚗' :
              b.kind === 'stay' ? '🏠' :
              b.kind === 'activity' ? '🎟️' : '📌'
            return (
              <li key={b.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                      <span aria-hidden className="text-2xl">{icon}</span>
                      <span>{b.title}</span>
                    </p>
                    {b.details && <p className="text-sm text-slate-700 mt-1">{b.details}</p>}
                    {b.confirmation && (
                      <p className="text-sm text-slate-600 mt-1">
                        Confirmation:{' '}
                        <span className="font-mono bg-slate-100 rounded px-2 py-0.5">{b.confirmation}</span>
                      </p>
                    )}
                    {b.link && (
                      <a
                        href={b.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-blue-700 underline underline-offset-2 break-all text-sm"
                      >
                        Open reservation →
                      </a>
                    )}
                  </div>
                  <CopyButton text={formatBooking(b)} label="Copy" />
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      {trip.map?.embedUrl && (
        <Section title="Map" icon="🗺️">
          <div className="aspect-video rounded-xl overflow-hidden border border-slate-200">
            <iframe
              title="Trip map"
              src={trip.map.embedUrl}
              className="w-full h-full"
              loading="lazy"
            />
          </div>
        </Section>
      )}
    </div>
  )
}
