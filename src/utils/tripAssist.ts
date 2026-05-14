import type { Trip } from '../types/trip'
import { makeStableIdFromLabel, editableFieldsFromTrip, type TripOverrideData } from './tripOverrides.js'

export type SmartAssistAction =
  | 'fill-missing'
  | 'improve-itinerary'
  | 'booking-reminders'
  | 'packing-checklist'
  | 'looser-day'
  | 'tighter-day'
  | 'improve-restaurants'
  | 'improve-activities'
  | 'must-do-mini-plans'
  | 'logistics-notes'

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

function addThingToDo(trip: Trip, title: string, category: string, notes?: string, sourceIds?: string[], nextStep?: string): boolean {
  if (trip.thingsToDo.some((item) => item.name.toLowerCase() === title.toLowerCase())) return false
  trip.thingsToDo.push({
    id: makeStableIdFromLabel('td', title, ids(trip.thingsToDo)),
    name: title,
    category,
    notes,
    sourceIds,
    status: 'needs-confirmation',
    why: 'Smart Assist added this from the saved planning brief and recommendation candidates.',
    nextStep: nextStep ?? 'Confirm current details before relying on this idea.',
  })
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
    brief: trip.planner?.brief,
    recommendations: trip.planner?.recommendations,
    miniPlans: trip.planner?.miniPlans,
    researchMode: trip.planner?.researchMode,
    locationLimitations: trip.planner?.locationLimitations,
    notes: [...(trip.planner?.notes ?? []), 'Smart Assist preview generated from the currently saved trip.'],
  }
}

export function generateSmartAssistPreview(trip: Trip, action: SmartAssistAction, note = ''): SmartAssistPreview {
  const next = clone(trip)
  const summary: string[] = []
  const warnings: string[] = []
  ensurePlanner(next)
  const recommendations = next.planner?.recommendations ?? []
  const miniPlans = next.planner?.miniPlans ?? []

  if (action === 'improve-restaurants' || action === 'improve-activities') {
    const desiredCategory = action === 'improve-restaurants' ? 'restaurant' : 'activity'
    const candidates = recommendations.filter((item) => item.category === desiredCategory).slice(0, 8)
    for (const candidate of candidates) {
      const added = addThingToDo(
        next,
        candidate.name,
        candidate.category === 'restaurant' ? 'Dining' : 'Activity',
        [candidate.whyItFits, candidate.logisticsNote].filter(Boolean).join(' '),
        candidate.sourceIds,
        candidate.nextStep,
      )
      if (added) summary.push(`Added ${candidate.name} to recommended ${desiredCategory === 'restaurant' ? 'restaurants' : 'activities'}.`)
    }
    if (candidates.length === 0) {
      warnings.push(`No saved ${desiredCategory === 'restaurant' ? 'restaurant' : 'activity'} recommendations were available. Run a stronger trip preview or add more location context first.`)
    }
  }

  if (action === 'must-do-mini-plans') {
    for (const plan of miniPlans) {
      if (!next.bookings.some((booking) => booking.title.toLowerCase() === plan.title.toLowerCase())) {
        next.bookings.push({
          id: makeStableIdFromLabel('bk', plan.title, ids(next.bookings)),
          kind: plan.type === 'travel' ? 'car' : 'activity',
          title: plan.title,
          when: plan.recommendedDate,
          details: [plan.recommendedTimeWindow ? `Suggested window: ${plan.recommendedTimeWindow}.` : undefined, plan.logisticsNote].filter(Boolean).join(' '),
          status: plan.status,
          why: plan.why,
          nextStep: plan.nextStep,
          sourceIds: plan.sourceIds,
        })
        summary.push(`Added booking/reminder card for ${plan.title}.`)
      }
      if (addChecklist(next, `Confirm ${plan.title}`, 'Must-dos', plan.logisticsNote ?? plan.nextStep)) summary.push(`Added checklist item for ${plan.title}.`)
      if (plan.packingImplication && addPacking(next, `${plan.title} packing check`, 'Activity-specific', plan.packingImplication)) summary.push(`Added packing check for ${plan.title}.`)
    }
    if (miniPlans.length === 0) warnings.push('No saved must-do mini-plans were available on this trip yet.')
  }

  if (action === 'logistics-notes') {
    for (const plan of miniPlans) {
      if (!plan.logisticsNote) continue
      let updated = false
      for (const day of next.itinerary) {
        for (const item of day.items) {
          if (!item.title.toLowerCase().includes(plan.title.toLowerCase().split(':')[0])) continue
          item.notes = [item.notes, plan.logisticsNote].filter(Boolean).join(' ')
          item.nextStep = item.nextStep ?? plan.nextStep
          item.sourceIds = item.sourceIds ?? plan.sourceIds
          updated = true
        }
      }
      if (updated) summary.push(`Added logistics note to itinerary item for ${plan.title}.`)
      if (addChecklist(next, `Confirm logistics for ${plan.title}`, 'Logistics', plan.logisticsNote)) summary.push(`Added logistics checklist item for ${plan.title}.`)
    }
    if (miniPlans.length === 0) warnings.push('No saved mini-plans were available to attach logistics notes from.')
  }

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
