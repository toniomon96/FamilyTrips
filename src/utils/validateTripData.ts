import type { Activity, Booking, Contact, Day, PackingItem, Person, Trip } from '../types/trip'

export type TripDataValidationError = {
  tripSlug: string
  path: string
  message: string
}

type IdItem = { id: string }

function addError(
  errors: TripDataValidationError[],
  tripSlug: string,
  path: string,
  message: string,
) {
  errors.push({ tripSlug, path, message })
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isPhone(value: string): boolean {
  if (value === '911') return true
  return /^\+?[0-9][0-9\s().-]{6,}$/.test(value)
}

function validateUniqueIds(
  errors: TripDataValidationError[],
  tripSlug: string,
  path: string,
  items: IdItem[],
) {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      addError(errors, tripSlug, path, `Duplicate id "${item.id}".`)
    }
    seen.add(item.id)
  }
}

function validateUrl(
  errors: TripDataValidationError[],
  tripSlug: string,
  path: string,
  value: string | undefined,
) {
  if (value && !isUrl(value)) addError(errors, tripSlug, path, `Invalid URL "${value}".`)
}

function validateBookingLinks(errors: TripDataValidationError[], tripSlug: string, bookings: Booking[]) {
  for (const booking of bookings) validateUrl(errors, tripSlug, `bookings.${booking.id}.link`, booking.link)
}

function validateItineraryLinks(errors: TripDataValidationError[], tripSlug: string, days: Day[]) {
  for (const day of days) {
    if (!isIsoDate(day.date)) addError(errors, tripSlug, `itinerary.${day.date}`, 'Invalid itinerary date.')
    day.items.forEach((item, index) => {
      validateUrl(errors, tripSlug, `itinerary.${day.date}.items.${index}.link`, item.link)
    })
  }
}

function validateActivityLinks(errors: TripDataValidationError[], tripSlug: string, activities: Activity[]) {
  for (const activity of activities) validateUrl(errors, tripSlug, `thingsToDo.${activity.id}.url`, activity.url)
}

function validateContacts(errors: TripDataValidationError[], tripSlug: string, contacts: Contact[]) {
  for (const contact of contacts) {
    if (contact.kind === 'url') validateUrl(errors, tripSlug, `contacts.${contact.id}.value`, contact.value)
    if (contact.kind === 'phone' && !isPhone(contact.value)) {
      addError(errors, tripSlug, `contacts.${contact.id}.value`, `Invalid phone "${contact.value}".`)
    }
  }
}

function validatePeople(errors: TripDataValidationError[], tripSlug: string, people: Person[]) {
  for (const person of people) {
    if (person.phone && !isPhone(person.phone)) {
      addError(errors, tripSlug, `people.${person.id}.phone`, `Invalid phone "${person.phone}".`)
    }
  }
}

function validatePlannerSources(errors: TripDataValidationError[], trip: Trip) {
  const sources = trip.planner?.sourceRefs ?? []
  const seen = new Set<string>()
  for (const source of sources) {
    if (seen.has(source.id)) addError(errors, trip.slug, 'planner.sourceRefs', `Duplicate source id "${source.id}".`)
    seen.add(source.id)
    validateUrl(errors, trip.slug, `planner.sourceRefs.${source.id}.url`, source.url)
  }
}

function validatePackableIds(
  errors: TripDataValidationError[],
  tripSlug: string,
  packing: PackingItem[] | undefined,
  supplies: PackingItem[] | undefined,
) {
  validateUniqueIds(errors, tripSlug, 'packing/supplies', [...(packing ?? []), ...(supplies ?? [])])
}

export function validateTripData(trips: Trip[]): TripDataValidationError[] {
  const errors: TripDataValidationError[] = []
  const slugs = new Set<string>()

  for (const trip of trips) {
    if (slugs.has(trip.slug)) addError(errors, trip.slug, 'slug', `Duplicate trip slug "${trip.slug}".`)
    slugs.add(trip.slug)

    if (!trip.name.trim()) addError(errors, trip.slug, 'name', 'Trip name is required.')
    if (!trip.location.trim()) addError(errors, trip.slug, 'location', 'Trip location is required.')
    if (!isIsoDate(trip.startDate)) addError(errors, trip.slug, 'startDate', 'Invalid start date.')
    if (!isIsoDate(trip.endDate)) addError(errors, trip.slug, 'endDate', 'Invalid end date.')
    if (trip.startDate > trip.endDate) addError(errors, trip.slug, 'dates', 'Start date is after end date.')

    validateUniqueIds(errors, trip.slug, 'bookings', trip.bookings)
    validateUniqueIds(errors, trip.slug, 'thingsToDo', trip.thingsToDo)
    validateUniqueIds(errors, trip.slug, 'people', trip.people)
    validateUniqueIds(errors, trip.slug, 'contacts', trip.contacts)
    validateUniqueIds(errors, trip.slug, 'checklist/eventTasks', [
      ...trip.checklist,
      ...(trip.eventTasks ?? []),
    ])
    validatePackableIds(errors, trip.slug, trip.packing, trip.supplies)
    validateUniqueIds(errors, trip.slug, 'budget', trip.budget)
    validateUniqueIds(errors, trip.slug, 'food', trip.food ?? [])
    validateUniqueIds(errors, trip.slug, 'copyBlocks', trip.copyBlocks ?? [])

    validateUrl(errors, trip.slug, 'stay.bookingLink', trip.stay.bookingLink)
    validateUrl(errors, trip.slug, 'map.embedUrl', trip.map?.embedUrl)
    validateBookingLinks(errors, trip.slug, trip.bookings)
    validateItineraryLinks(errors, trip.slug, trip.itinerary)
    validateActivityLinks(errors, trip.slug, trip.thingsToDo)
    validateContacts(errors, trip.slug, trip.contacts)
    validatePeople(errors, trip.slug, trip.people)
    validatePlannerSources(errors, trip)
  }

  return errors
}
