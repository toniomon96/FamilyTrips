import type { Trip } from '../types/trip'
import { makeStableIdFromLabel, editableFieldsFromTrip, type TripOverrideData } from './tripOverrides.js'

export type SmartAssistAction =
  | 'fill-missing'
  | 'improve-itinerary'
  | 'booking-reminders'
  | 'packing-checklist'
  | 'looser-day'
  | 'tighter-day'

export type SmartAssistPreview = {
  data: TripOverrideData
  mergedTrip: Trip
  summary: string[]
  warnings: string[]
}

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function addChecklist(trip: Trip, title: string, category: string, notes?: string): boolean {
  if (trip.checklist.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
  trip.checklist.push({
    id: makeStableIdFromLabel('ck', title, ids(trip.checklist)),
    title,
    category,
    done: false,
    notes,
    status: 'needs-confirmation',
  })
  return true
}

function addPacking(trip: Trip, title: string, category: string, notes?: string): boolean {
  const packing = trip.packing ?? []
  if (packing.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
  packing.push({
    id: makeStableIdFromLabel('pk', title, ids(packing)),
    title,
    category,
    notes,
    status: 'suggested',
  })
  trip.packing = packing
  return true
}

function ensurePlanner(trip: Trip) {
  trip.planner = {
    draftStrength: trip.planner?.draftStrength ?? 'medium',
    warnings: trip.planner?.warnings ?? [],
    missingInputs: trip.planner?.missingInputs ?? [],
    generatedAt: trip.planner?.generatedAt ?? new Date().toISOString(),
    sourceMode: trip.planner?.sourceMode ?? 'deterministic',
    sourceRefs: trip.planner?.sourceRefs ?? [],
    questions: trip.planner?.questions,
    notes: [...(trip.planner?.notes ?? []), 'Smart Assist preview generated from the currently saved trip.'],
  }
}

export function generateSmartAssistPreview(trip: Trip, action: SmartAssistAction, note = ''): SmartAssistPreview {
  const next = clone(trip)
  const summary: string[] = []
  const warnings: string[] = []
  ensurePlanner(next)

  if (action === 'fill-missing' || action === 'booking-reminders') {
    if (next.bookings.length === 0 && next.kind !== 'event') {
      next.bookings.push({
        id: 'bk-stay-follow-up',
        kind: 'stay',
        title: next.stay.name || 'Stay details',
        details: 'Add confirmation number, check-in time, address, and booking link.',
        when: next.startDate,
        status: 'needs-confirmation',
        why: 'Smart Assist found missing booking follow-up.',
        nextStep: 'Confirm and add exact stay details.',
      })
      summary.push('Added stay booking follow-up.')
    }
    for (const activity of next.thingsToDo.slice(0, 6)) {
      if (next.bookings.some((booking) => booking.title.toLowerCase() === activity.name.toLowerCase())) continue
      next.bookings.push({
        id: makeStableIdFromLabel('bk', activity.name, ids(next.bookings)),
        kind: 'activity',
        title: activity.name,
        details: 'Smart Assist booking reminder. Confirm time, provider, cost, transportation, and cancellation rules.',
        status: activity.status === 'confirmed' ? 'confirmed' : 'needs-confirmation',
        why: 'Converted an idea/place into a follow-up booking reminder.',
        nextStep: 'Confirm whether this needs to be reserved.',
      })
      summary.push(`Added booking reminder for ${activity.name}.`)
    }
  }

  if (action === 'fill-missing' || action === 'improve-itinerary' || action === 'looser-day' || action === 'tighter-day') {
    for (const day of next.itinerary) {
      if (day.items.length === 0) {
        day.items.push({
          time: next.kind === 'event' ? 'Main block' : 'Morning',
          title: next.kind === 'event' ? 'Add run-of-show block' : 'Add plan for the day',
          notes: 'Smart Assist placeholder. Replace with exact plans when known.',
          status: 'needs-confirmation',
        })
        summary.push(`Added starter item for ${day.date}.`)
      }
      if (action === 'looser-day' && !day.items.some((item) => /buffer|downtime|reset/i.test(item.title))) {
        day.items.splice(Math.min(day.items.length, 2), 0, {
          time: next.kind === 'event' ? 'Buffer' : 'Late afternoon',
          title: next.kind === 'event' ? 'Host buffer and reset' : 'Open buffer / reset',
          notes: 'Keep this block flexible so the day does not become overpacked.',
          status: 'suggested',
          why: 'Smart Assist loosened the day.',
        })
        summary.push(`Added buffer block to ${day.date}.`)
      }
      if (action === 'tighter-day' && day.items.length < 3) {
        day.items.push({
          time: next.kind === 'event' ? 'Next block' : 'Afternoon',
          title: next.kind === 'event' ? 'Add guest activity or food block' : 'Add optional activity or meal',
          notes: 'Smart Assist tighter-day placeholder. Replace with a selected option.',
          status: 'suggested',
          why: 'Smart Assist tightened an open day.',
        })
        summary.push(`Added optional block to ${day.date}.`)
      }
    }
  }

  if (action === 'fill-missing' || action === 'packing-checklist') {
    if (next.kind === 'event') {
      const eventTasks = next.eventTasks ?? []
      const eventTaskIds = ids(eventTasks)
      const addEventTask = (title: string, category: string) => {
        if (eventTasks.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
        eventTasks.push({ id: makeStableIdFromLabel('et', title, eventTaskIds), title, category, done: false, status: 'needs-confirmation' })
        eventTaskIds.push(eventTasks[eventTasks.length - 1].id)
        return true
      }
      if (addEventTask('Confirm food, drinks, and serving setup', 'Food')) summary.push('Added event food task.')
      if (addEventTask('Assign setup and cleanup owners', 'Assignments')) summary.push('Added setup/cleanup assignment task.')
      next.eventTasks = eventTasks
      const supplies = next.supplies ?? []
      const supplyIds = ids(supplies)
      const addSupply = (title: string, category: string) => {
        if (supplies.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
        supplies.push({ id: makeStableIdFromLabel('sup', title, supplyIds), title, category, status: 'suggested' })
        supplyIds.push(supplies[supplies.length - 1].id)
        return true
      }
      if (addSupply('Trash bags and cleanup supplies', 'Cleanup')) summary.push('Added cleanup supplies.')
      if (addSupply('Ice, drinks, cups, plates, and napkins', 'Food service')) summary.push('Added food-service supplies.')
      next.supplies = supplies
    } else {
      if (addChecklist(next, 'Confirm the top three bookings', 'Reservations', 'Smart Assist reminder from current plan.')) summary.push('Added booking confirmation checklist item.')
      if (addChecklist(next, 'Share latest plan with the group', 'Admin')) summary.push('Added share-plan checklist item.')
      if (addPacking(next, 'Weather-appropriate outfit options', 'Clothes')) summary.push('Added weather-aware packing placeholder.')
      if (addPacking(next, 'Chargers and battery pack', 'Tech')) summary.push('Added tech packing placeholder.')
    }
  }

  if (note.trim()) {
    next.copyBlocks = [
      ...(next.copyBlocks ?? []),
      {
        id: makeStableIdFromLabel('msg', 'smart assist note', ids(next.copyBlocks ?? [])),
        title: 'Smart Assist note',
        body: note.trim(),
        status: 'suggested',
      },
    ]
    summary.push('Saved Smart Assist note into copyable messages.')
  }

  if (summary.length === 0) {
    warnings.push('Smart Assist did not find a safe automatic change for this action. Try adding notes or choosing a different action.')
  }

  return {
    data: editableFieldsFromTrip(next),
    mergedTrip: next,
    summary,
    warnings,
  }
}
