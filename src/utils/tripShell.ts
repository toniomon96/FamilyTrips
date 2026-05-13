import type { ChecklistItem, PackingItem, Person, PlanKind, Trip } from '../types/trip'
import { makeStableIdFromLabel } from './tripOverrides.js'
import { validateTripData, type TripDataValidationError } from './validateTripData.js'

export type TripTemplateId = 'general' | 'honeymoon' | 'beach' | 'road' | 'event'

export type TripShellInput = {
  slug?: string
  name: string
  location: string
  startDate: string
  endDate: string
  template: TripTemplateId
  travelers?: string
  stayName?: string
  createdBy?: string
}

export const TRIP_TEMPLATE_OPTIONS: { id: TripTemplateId; label: string }[] = [
  { id: 'general', label: 'General trip' },
  { id: 'honeymoon', label: 'Honeymoon / couple trip' },
  { id: 'beach', label: 'Beach / resort trip' },
  { id: 'road', label: 'Road trip' },
  { id: 'event', label: 'Event / party' },
]

export function slugifyTripSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function isValidTripSlug(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value)
}

function parseTravelers(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[\n,;]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((name, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index)
}

function makePeople(travelers: string | undefined): Person[] {
  const ids: string[] = []
  return parseTravelers(travelers).map((name) => {
    const id = makeStableIdFromLabel('p', name, ids)
    ids.push(id)
    return { id, name, role: 'Traveler' }
  })
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildDays(startDate: string, endDate: string, template: TripTemplateId): Trip['itinerary'] {
  const days: Trip['itinerary'] = []
  let date = startDate
  let index = 0
  while (date <= endDate && index < 31) {
    const isFirst = index === 0
    const isLast = date === endDate
    days.push({
      date,
      title: isFirst ? 'Arrival day' : isLast ? 'Departure day' : `Day ${index + 1}`,
      items: [
        {
          title: isFirst
            ? 'Arrive and settle in'
            : isLast
              ? 'Pack up and head out'
              : template === 'event'
                ? 'Add event plan'
                : 'Add plans for the day',
          notes: 'Use the manage page to add times, addresses, reservations, and notes.',
        },
      ],
    })
    if (date === endDate) break
    date = addDays(date, 1)
    index += 1
  }
  return days
}

function templateChecklist(template: TripTemplateId): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { id: 'ck-confirm-dates', title: 'Confirm dates and headcount', category: 'Admin', done: false },
    { id: 'ck-add-stay-details', title: 'Add stay address and check-in details', category: 'Stay', done: false },
    { id: 'ck-add-travel-details', title: 'Add flights, drive plan, or transportation', category: 'Travel', done: false },
    { id: 'ck-share-link', title: 'Share the trip link with the group', category: 'Admin', done: false },
  ]

  if (template === 'honeymoon') {
    items.push(
      { id: 'ck-book-dinners', title: 'Book special dinner reservations', category: 'Reservations', done: false },
      { id: 'ck-book-activities', title: 'Book priority activities', category: 'Activities', done: false },
    )
  }

  if (template === 'beach') {
    items.push({ id: 'ck-beach-plan', title: 'Confirm beach / pool plan', category: 'Activities', done: false })
  }

  if (template === 'road') {
    items.push({ id: 'ck-route-plan', title: 'Confirm route and stops', category: 'Travel', done: false })
  }

  if (template === 'event') {
    items.push({ id: 'ck-event-supplies', title: 'Add food, supplies, and setup tasks', category: 'Event', done: false })
  }

  return items
}

function templatePacking(template: TripTemplateId): PackingItem[] {
  const items: PackingItem[] = [
    { id: 'pk-id', title: 'Photo ID / travel documents', category: 'Travel docs' },
    { id: 'pk-charger', title: 'Phone charger', category: 'Tech' },
    { id: 'pk-toiletries', title: 'Toiletries', category: 'Toiletries' },
  ]

  if (template === 'honeymoon') {
    items.push(
      { id: 'pk-dinner-outfits', title: 'Nice dinner outfits', category: 'Clothes' },
      { id: 'pk-swim', title: 'Swimsuits', category: 'Beach / Pool' },
      { id: 'pk-sunscreen', title: 'Sunscreen', category: 'Beach / Pool' },
    )
  }

  if (template === 'beach') {
    items.push(
      { id: 'pk-swimsuits', title: 'Swimsuits', category: 'Beach / Pool' },
      { id: 'pk-sunscreen', title: 'Sunscreen', category: 'Beach / Pool' },
      { id: 'pk-coverups', title: 'Coverups / beach clothes', category: 'Beach / Pool' },
    )
  }

  if (template === 'road') {
    items.push(
      { id: 'pk-road-snacks', title: 'Road snacks', category: 'Car / Road trip' },
      { id: 'pk-car-charger', title: 'Car charger', category: 'Car / Road trip' },
    )
  }

  return items
}

export function createTripShell(input: TripShellInput): Trip {
  const name = input.name.trim()
  const location = input.location.trim()
  const slug = slugifyTripSlug(input.slug ?? name)
  const kind: PlanKind | undefined = input.template === 'event' ? 'event' : undefined
  const stayName = input.stayName?.trim() || (input.template === 'event' ? 'Event location' : 'Stay TBD')
  const people = makePeople(input.travelers)

  return {
    slug,
    kind,
    name,
    location,
    startDate: input.startDate,
    endDate: input.endDate,
    visibility: 'unlisted',
    currency: '$',
    tagline: input.template === 'honeymoon' ? 'A loose, romantic plan with room to breathe' : undefined,
    stay: {
      name: stayName,
      address: location,
      checkIn: `${input.startDate} - confirm time`,
      checkOut: `${input.endDate} - confirm time`,
      amenities: ['Add booking details, access notes, and helpful amenities from the manage page.'],
      notes: 'This trip was created from the quick wizard. Use the manage page to fill in the details.',
    },
    bookings: [
      {
        id: 'stay',
        kind: input.template === 'event' ? 'other' : 'stay',
        title: stayName,
        details: 'Add confirmation number, booking link, and arrival notes when ready.',
        when: input.startDate,
      },
    ],
    itinerary: buildDays(input.startDate, input.endDate, input.template),
    thingsToDo: [],
    people,
    contacts: [{ id: 'c-emergency', label: 'Emergency', value: '911', kind: 'phone' }],
    checklist: input.template === 'event' ? [] : templateChecklist(input.template),
    packing: input.template === 'event' ? [] : templatePacking(input.template),
    supplies: input.template === 'event' ? templatePacking(input.template) : undefined,
    eventTasks: input.template === 'event' ? templateChecklist(input.template) : undefined,
    budget: [],
  }
}

export function validateTripForSave(trip: Trip): TripDataValidationError[] {
  try {
    if (typeof trip.slug !== 'string' || !isValidTripSlug(trip.slug)) {
      return [{ tripSlug: trip.slug || 'new-trip', path: 'slug', message: 'Trip URL slug is invalid.' }]
    }
    return validateTripData([trip])
  } catch {
    return [{ tripSlug: trip.slug || 'new-trip', path: 'data', message: 'Trip data has an invalid shape.' }]
  }
}
