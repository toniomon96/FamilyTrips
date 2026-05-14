import type { Activity, Booking, Contact, Day, PackingItem, Person, Trip } from '../types/trip'
import { isDateWithinRange, isIsoDate, isValidDateRange } from './dateValidation.js'

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

function validateBookingLinksAndDates(
  errors: TripDataValidationError[],
  tripSlug: string,
  bookings: Booking[],
  startDate: string,
  endDate: string,
) {
  for (const booking of bookings) {
    validateUrl(errors, tripSlug, `bookings.${booking.id}.link`, booking.link)
    if (booking.when && /^\d{4}-\d{2}-\d{2}$/.test(booking.when)) {
      if (!isIsoDate(booking.when)) {
        addError(errors, tripSlug, `bookings.${booking.id}.when`, 'Booking date must be a real calendar date.')
      } else if (isValidDateRange(startDate, endDate) && !isDateWithinRange(booking.when, startDate, endDate)) {
        addError(errors, tripSlug, `bookings.${booking.id}.when`, 'Booking date must stay within the trip date range.')
      }
    }
  }
}

function validateItineraryLinksAndDates(
  errors: TripDataValidationError[],
  tripSlug: string,
  days: Day[],
  startDate: string,
  endDate: string,
) {
  for (const day of days) {
    if (!isIsoDate(day.date)) addError(errors, tripSlug, `itinerary.${day.date}`, 'Invalid itinerary date.')
    else if (isValidDateRange(startDate, endDate) && !isDateWithinRange(day.date, startDate, endDate)) {
      addError(errors, tripSlug, `itinerary.${day.date}`, 'Itinerary date must stay within the trip date range.')
    }
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
  const sourceIds = new Set<string>()
  for (const source of sources) {
    if (seen.has(source.id)) addError(errors, trip.slug, 'planner.sourceRefs', `Duplicate source id "${source.id}".`)
    seen.add(source.id)
    sourceIds.add(source.id)
    validateUrl(errors, trip.slug, `planner.sourceRefs.${source.id}.url`, source.url)
  }

  const recommendationIds = new Set<string>()
  for (const recommendation of trip.planner?.recommendations ?? []) {
    if (recommendationIds.has(recommendation.id)) {
      addError(errors, trip.slug, 'planner.recommendations', `Duplicate recommendation id "${recommendation.id}".`)
    }
    recommendationIds.add(recommendation.id)
    for (const sourceId of recommendation.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) addError(errors, trip.slug, `planner.recommendations.${recommendation.id}.sourceIds`, `Unknown source id "${sourceId}".`)
    }
  }

  const miniPlanIds = new Set<string>()
  for (const miniPlan of trip.planner?.miniPlans ?? []) {
    if (miniPlanIds.has(miniPlan.id)) addError(errors, trip.slug, 'planner.miniPlans', `Duplicate mini-plan id "${miniPlan.id}".`)
    miniPlanIds.add(miniPlan.id)
    if (miniPlan.candidateId && !recommendationIds.has(miniPlan.candidateId)) {
      addError(errors, trip.slug, `planner.miniPlans.${miniPlan.id}.candidateId`, `Unknown recommendation id "${miniPlan.candidateId}".`)
    }
    if (miniPlan.recommendedDate) {
      if (!isIsoDate(miniPlan.recommendedDate)) {
        addError(errors, trip.slug, `planner.miniPlans.${miniPlan.id}.recommendedDate`, 'Mini-plan date must be a real calendar date.')
      } else if (isValidDateRange(trip.startDate, trip.endDate) && !isDateWithinRange(miniPlan.recommendedDate, trip.startDate, trip.endDate)) {
        addError(errors, trip.slug, `planner.miniPlans.${miniPlan.id}.recommendedDate`, 'Mini-plan date must stay within the trip date range.')
      }
    }
    for (const sourceId of miniPlan.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) addError(errors, trip.slug, `planner.miniPlans.${miniPlan.id}.sourceIds`, `Unknown source id "${sourceId}".`)
    }
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

function validateBudget(errors: TripDataValidationError[], tripSlug: string, trip: Trip) {
  for (const item of trip.budget) {
    if (!Number.isFinite(item.total) || item.total < 0) {
      addError(errors, tripSlug, `budget.${item.id}.total`, 'Budget total must be zero or greater.')
    }
    if (!Number.isInteger(item.splitCount) || item.splitCount < 1) {
      addError(errors, tripSlug, `budget.${item.id}.splitCount`, 'Budget split count must be at least 1.')
    }
  }
}

function validateMap(errors: TripDataValidationError[], trip: Trip) {
  const center = trip.map?.center
  if (!center) return
  if (!Number.isFinite(center.lat) || center.lat < -90 || center.lat > 90) {
    addError(errors, trip.slug, 'map.center.lat', 'Map latitude must be between -90 and 90.')
  }
  if (!Number.isFinite(center.lng) || center.lng < -180 || center.lng > 180) {
    addError(errors, trip.slug, 'map.center.lng', 'Map longitude must be between -180 and 180.')
  }
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
    if (isIsoDate(trip.startDate) && isIsoDate(trip.endDate) && trip.startDate > trip.endDate) {
      addError(errors, trip.slug, 'dates', 'Start date is after end date.')
    }

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
    validateBookingLinksAndDates(errors, trip.slug, trip.bookings, trip.startDate, trip.endDate)
    validateItineraryLinksAndDates(errors, trip.slug, trip.itinerary, trip.startDate, trip.endDate)
    validateActivityLinks(errors, trip.slug, trip.thingsToDo)
    validateContacts(errors, trip.slug, trip.contacts)
    validatePeople(errors, trip.slug, trip.people)
    validatePlannerSources(errors, trip)
    validateBudget(errors, trip.slug, trip)
    validateMap(errors, trip)
  }

  return errors
}
