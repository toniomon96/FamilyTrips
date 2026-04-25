import type {
  Booking,
  BudgetItem,
  ChecklistItem,
  Day,
  PackingItem,
  Person,
  Stay,
  Trip,
} from '../types/trip'

export function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateRange(startIso: string, endIso: string): string {
  return `${formatShortDate(startIso)} – ${formatShortDate(endIso)}`
}

export function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetweenLocalDates(fromIso: string, toIso: string): number {
  const [fromY, fromM, fromD] = fromIso.split('-').map(Number)
  const [toY, toM, toD] = toIso.split('-').map(Number)
  const from = Date.UTC(fromY, fromM - 1, fromD)
  const to = Date.UTC(toY, toM - 1, toD)
  return Math.round((to - from) / (1000 * 60 * 60 * 24))
}

export function daysUntil(iso: string): number {
  return daysBetweenLocalDates(todayLocalISO(), iso)
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString('en-US')}`
}

export function isBudgetTbd(item: BudgetItem): boolean {
  return item.status === 'tbd'
}

export function budgetAmount(item: BudgetItem): number {
  return isBudgetTbd(item) ? 0 : item.total
}

export function budgetShare(item: BudgetItem): number {
  if (isBudgetTbd(item)) return 0
  return item.total / item.splitCount
}

export function formatBudgetAmount(item: BudgetItem, currency: string): string {
  return isBudgetTbd(item) ? 'TBD' : formatMoney(item.total, currency)
}

export function formatBudgetShare(item: BudgetItem, currency: string): string {
  return isBudgetTbd(item)
    ? 'TBD/person'
    : `${formatMoney(Math.round(budgetShare(item)), currency)}/person`
}

export function formatSplitCount(count: number): string {
  return `${count} ${count === 1 ? 'way' : 'ways'}`
}

export function formatTripHeader(trip: Trip): string {
  return `✈️ ${trip.name} — ${trip.location}\n${formatDateRange(trip.startDate, trip.endDate)}`
}

export function formatTripOverview(trip: Trip): string {
  const lines: string[] = []
  lines.push(formatTripHeader(trip))
  lines.push('')
  lines.push(`🏠 ${trip.stay.name}`)
  lines.push(trip.stay.address)
  lines.push(`Check-in: ${trip.stay.checkIn}`)
  lines.push(`Check-out: ${trip.stay.checkOut}`)
  if (trip.stay.wifiSsid) {
    lines.push(`Wi-Fi: ${trip.stay.wifiSsid}${trip.stay.wifiPassword ? ' / ' + trip.stay.wifiPassword : ''}`)
  }
  if (trip.people.length) {
    lines.push('')
    lines.push('👪 Who’s coming')
    for (const p of trip.people) {
      lines.push(`• ${p.name}${p.phone ? ` — ${p.phone}` : ''}`)
    }
  }
  return lines.join('\n')
}

export function formatStay(stay: Stay, trip: Trip): string {
  const lines: string[] = []
  lines.push(`🏠 ${stay.name} — ${trip.location}`)
  lines.push(formatDateRange(trip.startDate, trip.endDate))
  lines.push(stay.address)
  lines.push(`Check-in: ${stay.checkIn}`)
  lines.push(`Check-out: ${stay.checkOut}`)
  if (stay.wifiSsid) {
    lines.push(`Wi-Fi: ${stay.wifiSsid}${stay.wifiPassword ? ' / ' + stay.wifiPassword : ''}`)
  }
  if (stay.hostName) {
    lines.push(`Host: ${stay.hostName}${stay.hostPhone ? ' ' + stay.hostPhone : ''}`)
  }
  if (stay.confirmation) lines.push(`Confirmation: ${stay.confirmation}`)
  if (stay.bookingLink) lines.push(stay.bookingLink)
  return lines.join('\n')
}

export function formatBooking(b: Booking): string {
  const icon =
    b.kind === 'flight' ? '✈️' :
    b.kind === 'car' ? '🚗' :
    b.kind === 'stay' ? '🏠' :
    b.kind === 'activity' ? '🎟️' : '📌'
  const lines = [`${icon} ${b.title}`]
  if (b.details) lines.push(b.details)
  if (b.confirmation) lines.push(`Confirmation: ${b.confirmation}`)
  if (b.link) lines.push(b.link)
  return lines.join('\n')
}

export function formatDay(day: Day): string {
  const lines: string[] = []
  const header = day.title ? `📅 ${formatLongDate(day.date)} — ${day.title}` : `📅 ${formatLongDate(day.date)}`
  lines.push(header)
  for (const item of day.items) {
    const time = item.time ? `${item.time} · ` : ''
    lines.push(`• ${time}${item.title}`)
    if (item.address) lines.push(`  ${item.address}`)
    if (item.notes) lines.push(`  ${item.notes}`)
    if (item.link) lines.push(`  ${item.link}`)
  }
  return lines.join('\n')
}

export function formatItinerary(trip: Trip): string {
  const lines: string[] = []
  lines.push(`🗓️ Itinerary — ${trip.name}`)
  lines.push('')
  for (const day of trip.itinerary) {
    lines.push(formatDay(day))
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function formatPerson(p: Person): string {
  return p.phone ? `${p.name} — ${p.phone}` : p.name
}

export function formatPeople(trip: Trip): string {
  const lines: string[] = [`👪 Who’s coming — ${trip.name}`]
  for (const p of trip.people) {
    lines.push(`• ${formatPerson(p)}`)
  }
  return lines.join('\n')
}

export function formatChecklist(items: ChecklistItem[]): string {
  const byCat = new Map<string, ChecklistItem[]>()
  for (const it of items) {
    const list = byCat.get(it.category) ?? []
    list.push(it)
    byCat.set(it.category, list)
  }
  const lines: string[] = ['✅ Trip Checklist']
  for (const [cat, list] of byCat) {
    lines.push('')
    lines.push(cat)
    for (const it of list) {
      lines.push(`${it.done ? '✔' : '☐'} ${it.title}`)
    }
  }
  return lines.join('\n')
}

export function formatPackingList(items: PackingItem[], title = 'Packing List'): string {
  const byCat = new Map<string, PackingItem[]>()
  for (const it of items) {
    const list = byCat.get(it.category) ?? []
    list.push(it)
    byCat.set(it.category, list)
  }
  const lines: string[] = [`🎒 ${title}`]
  for (const [cat, list] of byCat) {
    lines.push('')
    lines.push(cat)
    for (const it of list) {
      const quantity = it.quantity ? ` (${it.quantity})` : ''
      const assigned = it.assignedTo ? ` — ${it.assignedTo}` : ''
      lines.push(`${it.packed ? '✔' : '☐'} ${it.title}${quantity}${assigned}`)
      if (it.notes) lines.push(`  ${it.notes}`)
    }
  }
  return lines.join('\n')
}

export function formatBudget(items: BudgetItem[], currency: string): string {
  const total = items.reduce((s, i) => s + budgetAmount(i), 0)
  const perPerson = items.reduce((s, i) => s + budgetShare(i), 0)
  const hasKnownItems = items.some((item) => !isBudgetTbd(item))
  const lines: string[] = ['💰 Trip Budget']
  for (const i of items) {
    lines.push(
      `• ${i.name}: ${formatBudgetAmount(i, currency)} (split ${formatSplitCount(i.splitCount)} = ${formatBudgetShare(i, currency)})`,
    )
  }
  lines.push('')
  lines.push(`Total: ${hasKnownItems ? formatMoney(total, currency) : 'TBD'}`)
  lines.push(`Your share: ${hasKnownItems ? formatMoney(Math.round(perPerson), currency) : 'TBD'}`)
  return lines.join('\n')
}

export function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))
  if (diffSec < 45) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  const diffWk = Math.floor(diffDay / 7)
  if (diffWk < 5) return `${diffWk}w ago`
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
