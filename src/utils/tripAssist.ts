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
  | 'event-run-of-show'
  | 'event-supplies'
  | 'share-summary'

export type SmartAssistSectionId =
  | 'overview'
  | 'itinerary'
  | 'recommendations'
  | 'bookings'
  | 'checklist'
  | 'packing'
  | 'budget'
  | 'event'
  | 'share'
  | 'planner'

export type SmartAssistPreviewSection = {
  id: SmartAssistSectionId
  label: string
  summary: string
  fields: (keyof TripOverrideData)[]
}

export type SmartAssistPreview = {
  data: TripOverrideData
  mergedTrip: Trip
  summary: string[]
  warnings: string[]
  sections: SmartAssistPreviewSection[]
}

const SMART_ASSIST_PLANNER_NOTE = 'Smart Assist preview generated from the currently saved trip.'

const ASSIST_SECTIONS: {
  id: SmartAssistSectionId
  label: string
  summary: string
  fields: (keyof TripOverrideData)[]
}[] = [
  {
    id: 'overview',
    label: 'Overview and stay',
    summary: 'Basic plan details, visibility, stay, people, contacts, or map fields changed.',
    fields: ['kind', 'name', 'location', 'startDate', 'endDate', 'visibility', 'heroImage', 'currency', 'tagline', 'stay', 'people', 'contacts', 'map'],
  },
  {
    id: 'itinerary',
    label: 'Itinerary',
    summary: 'Day-by-day schedule or run-of-show changed.',
    fields: ['itinerary'],
  },
  {
    id: 'recommendations',
    label: 'Recommended places',
    summary: 'Restaurants, activities, entertainment, or things-to-do changed.',
    fields: ['thingsToDo'],
  },
  {
    id: 'bookings',
    label: 'Bookings and confirmations',
    summary: 'Booking, reservation, or confirmation follow-up cards changed.',
    fields: ['bookings'],
  },
  {
    id: 'checklist',
    label: 'Checklist',
    summary: 'Checklist tasks changed.',
    fields: ['checklist'],
  },
  {
    id: 'packing',
    label: 'Packing',
    summary: 'Packing or supply items changed.',
    fields: ['packing', 'supplies'],
  },
  {
    id: 'budget',
    label: 'Budget',
    summary: 'Budget placeholders or estimates changed.',
    fields: ['budget'],
  },
  {
    id: 'event',
    label: 'Event details',
    summary: 'Event food, supplies, or assignments changed.',
    fields: ['food', 'supplies', 'eventTasks'],
  },
  {
    id: 'share',
    label: 'Share messages',
    summary: 'Copyable messages changed.',
    fields: ['copyBlocks'],
  },
  {
    id: 'planner',
    label: 'Planner notes',
    summary: 'Draft metadata, source notes, recommendation candidates, or mini-plans changed.',
    fields: ['planner'],
  },
]

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function fieldValue(data: TripOverrideData, field: keyof TripOverrideData): unknown {
  return (data as Record<string, unknown>)[field]
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function buildPreviewSections(before: Trip, after: Trip): SmartAssistPreviewSection[] {
  const beforeData = editableFieldsFromTrip(before)
  const afterData = editableFieldsFromTrip(after)

  return ASSIST_SECTIONS.flatMap((section) => {
    const changedFields = section.fields.filter((field) => !sameValue(fieldValue(beforeData, field), fieldValue(afterData, field)))
    if (changedFields.length === 0) return []
    return [{ ...section, fields: changedFields }]
  })
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

function addEventTask(trip: Trip, title: string, category: string, notes?: string): boolean {
  const eventTasks = trip.eventTasks ?? []
  if (eventTasks.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
  eventTasks.push({
    id: makeStableIdFromLabel('et', title, ids(eventTasks)),
    title,
    category,
    done: false,
    notes,
    status: 'needs-confirmation',
  })
  trip.eventTasks = eventTasks
  return true
}

function addEventSupply(trip: Trip, title: string, category: string, notes?: string): boolean {
  const supplies = trip.supplies ?? []
  if (supplies.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
  supplies.push({
    id: makeStableIdFromLabel('sup', title, ids(supplies)),
    title,
    category,
    notes,
    status: 'suggested',
  })
  trip.supplies = supplies
  return true
}

function addEventItineraryItem(trip: Trip, time: string, title: string, notes: string): boolean {
  const day = trip.itinerary[0]
  if (!day) return false
  if (day.items.some((item) => item.title.toLowerCase() === title.toLowerCase())) return false
  day.items.push({
    time,
    title,
    notes,
    status: 'needs-confirmation',
    why: 'Smart Assist added an event-native run-of-show step.',
    nextStep: 'Confirm owner, timing, and any supplies needed.',
  })
  return true
}

function statusNeedsAction(status: unknown): boolean {
  return status === 'needs-booking' || status === 'needs-confirmation'
}

function formatTripDates(trip: Trip): string {
  return trip.startDate === trip.endDate ? trip.startDate : `${trip.startDate} to ${trip.endDate}`
}

function joinList(items: string[], fallback: string, limit = 5): string {
  const clean = items.map((item) => item.trim()).filter(Boolean)
  if (clean.length === 0) return fallback
  return clean.slice(0, limit).map((item) => `- ${item}`).join('\n')
}

function upsertCopyBlock(trip: Trip, idBase: string, title: string, body: string): boolean {
  const copyBlocks = trip.copyBlocks ?? []
  const existing = copyBlocks.find((block) => block.title.toLowerCase() === title.toLowerCase() || block.id === idBase)
  if (existing) {
    if (existing.body === body && existing.status === 'suggested') return false
    existing.body = body
    existing.status = 'suggested'
    return true
  }
  copyBlocks.push({
    id: makeStableIdFromLabel('msg', idBase, ids(copyBlocks)),
    title,
    body,
    status: 'suggested',
  })
  trip.copyBlocks = copyBlocks
  return true
}

function buildShareSummaryBlocks(trip: Trip): { title: string; body: string }[] {
  const isEvent = trip.kind === 'event'
  const recommendations = trip.planner?.recommendations ?? []
  const miniPlans = trip.planner?.miniPlans ?? []
  const locationAnchor = trip.planner?.brief?.stayName
    || trip.planner?.brief?.venueName
    || trip.stay.name
    || trip.location
  const actionItems = [
    ...trip.bookings.map((item) => ({
      title: item.title,
      detail: item.nextStep || item.details,
      status: item.status,
    })),
    ...(isEvent ? trip.eventTasks ?? [] : trip.checklist).map((item) => ({
      title: item.title,
      detail: item.nextStep || item.notes,
      status: item.status,
    })),
  ].filter((item) => statusNeedsAction(item.status))
  const topRestaurants = recommendations
    .filter((item) => item.category === 'restaurant')
    .slice(0, 4)
    .map((item) => `${item.name}${item.nextStep ? ` - ${item.nextStep}` : ''}`)
  const topActivities = recommendations
    .filter((item) => item.category === 'activity' || item.category === 'entertainment')
    .slice(0, 4)
    .map((item) => `${item.name}${item.nextStep ? ` - ${item.nextStep}` : ''}`)
  const mustDos = miniPlans.slice(0, 5).map((item) => {
    const timing = [item.recommendedDate, item.recommendedTimeWindow].filter(Boolean).join(' ')
    return `${item.title}${timing ? ` (${timing})` : ''}${item.nextStep ? ` - ${item.nextStep}` : ''}`
  })

  if (isEvent) {
    return [
      {
        title: 'Group text summary',
        body: [
          `${trip.name}`,
          `When: ${formatTripDates(trip)}`,
          `Where: ${locationAnchor}`,
          '',
          'Plan:',
          joinList(trip.itinerary.flatMap((day) => day.items.slice(0, 4).map((item) => `${item.time ? `${item.time}: ` : ''}${item.title}`)), 'Run-of-show still needs review.'),
          '',
          'Needs confirmation:',
          joinList(actionItems.map((item) => `${item.title}${item.detail ? ` - ${item.detail}` : ''}`), 'No urgent event tasks are flagged right now.'),
        ].join('\n'),
      },
      {
        title: 'What to bring / assign',
        body: joinList(
          [
            ...(trip.food ?? []).slice(0, 4).map((item) => `${item.title}${item.assignedTo ? ` - ${item.assignedTo}` : ''}`),
            ...(trip.supplies ?? []).slice(0, 6).map((item) => `${item.title}${item.assignedTo ? ` - ${item.assignedTo}` : ''}`),
          ],
          'No food or supply assignments are listed yet.',
          10,
        ),
      },
    ]
  }

  return [
    {
      title: 'Group text summary',
      body: [
        `${trip.name}`,
        `Dates: ${formatTripDates(trip)}`,
        `Home base: ${locationAnchor}`,
        '',
        'Must-dos:',
        joinList(mustDos, 'No must-dos are structured yet.'),
        '',
        'Food / places to review:',
        joinList(topRestaurants, 'No restaurant shortlist is stored yet.'),
        '',
        'Activities / entertainment:',
        joinList(topActivities, 'No activity shortlist is stored yet.'),
      ].join('\n'),
    },
    {
      title: 'Booking follow-up text',
      body: [
        `Before relying on the ${trip.name} plan, these need booking or confirmation:`,
        '',
        joinList(actionItems.map((item) => `${item.title}${item.detail ? ` - ${item.detail}` : ''}`), 'No urgent booking or confirmation items are flagged right now.', 8),
        '',
        'Reminder: this planner is source/search aware, not live availability or routing. Confirm transportation, hours, prices, and reservations before locking anything in.',
      ].join('\n'),
    },
  ]
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
  const notes = trip.planner?.notes ?? []
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
    notes: notes.includes(SMART_ASSIST_PLANNER_NOTE) ? notes : [...notes, SMART_ASSIST_PLANNER_NOTE],
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

  if (action === 'event-run-of-show') {
    if (next.kind !== 'event') {
      warnings.push('Run-of-show assist is only for event plans.')
    } else {
      if (addEventItineraryItem(next, 'Setup', 'Host setup window', 'Confirm who arrives early, what needs staged, and where supplies go.')) summary.push('Added host setup window.')
      if (addEventItineraryItem(next, 'Arrival', 'Guest arrival buffer', 'Leave a flexible arrival buffer so the host is not solving setup during arrivals.')) summary.push('Added guest arrival buffer.')
      if (addEventItineraryItem(next, 'Main block', 'Food, activity, or main moment', 'Confirm the main event moment, food timing, and any assignment owners.')) summary.push('Added main event block.')
      if (addEventItineraryItem(next, 'Wrap', 'Cleanup and leftovers plan', 'Confirm trash, dishes, leftover food, and who handles final cleanup.')) summary.push('Added cleanup run-of-show block.')
      if (addEventTask(next, 'Assign setup owner', 'Assignments', 'Pick the person or household handling early setup.')) summary.push('Added setup owner task.')
      if (addEventTask(next, 'Assign cleanup owner', 'Assignments', 'Pick the person or household handling cleanup.')) summary.push('Added cleanup owner task.')
    }
  }

  if (action === 'event-supplies') {
    if (next.kind !== 'event') {
      warnings.push('Event supplies assist is only for event plans.')
    } else {
      if (addEventSupply(next, 'Serving table basics', 'Food service', 'Plates, napkins, cups, utensils, serving spoons, and table cover if needed.')) summary.push('Added serving table basics.')
      if (addEventSupply(next, 'Drinks and ice plan', 'Drinks', 'Confirm cooler, ice, water, kid drinks, adult drinks, and who brings each item.')) summary.push('Added drinks and ice plan.')
      if (addEventSupply(next, 'Cleanup kit', 'Cleanup', 'Trash bags, paper towels, wipes, dish plan, and a place for leftovers.')) summary.push('Added cleanup kit.')
      if (addEventTask(next, 'Confirm who brings food and drinks', 'Food', 'Turn food and drink assumptions into assigned owners before the event.')) summary.push('Added food assignment task.')
      if (addEventTask(next, 'Send final event reminder', 'Share', 'Send time, address/parking note, what to bring, and any kid/activity notes.')) summary.push('Added final reminder task.')
    }
  }

  if (action === 'share-summary') {
    const blocks = buildShareSummaryBlocks(next)
    for (const block of blocks) {
      if (upsertCopyBlock(next, block.title, block.title, block.body)) summary.push(`Updated ${block.title}.`)
    }
    if (blocks.length === 0) warnings.push('Smart Assist could not build a share summary from the current plan.')
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
      if (addEventTask(next, 'Confirm food, drinks, and serving setup', 'Food')) summary.push('Added event food task.')
      if (addEventTask(next, 'Assign setup and cleanup owners', 'Assignments')) summary.push('Added setup/cleanup assignment task.')
      if (addEventSupply(next, 'Trash bags and cleanup supplies', 'Cleanup')) summary.push('Added cleanup supplies.')
      if (addEventSupply(next, 'Ice, drinks, cups, plates, and napkins', 'Food service')) summary.push('Added food-service supplies.')
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
    sections: buildPreviewSections(trip, next),
  }
}
