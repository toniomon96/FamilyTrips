export type DestinationPackItem = {
  id: string
  name: string
  category: string
  url?: string
  address?: string
  notes: string
  bookingNote?: string
}

export type DestinationPack = {
  id: string
  name: string
  location: string
  address: string
  phone?: string
  matchers: string[]
  sourceUrls: string[]
  restaurants: DestinationPackItem[]
  activities: DestinationPackItem[]
  contacts: DestinationPackItem[]
  planningNotes: string[]
}

const LE_BLANC_LOS_CABOS: DestinationPack = {
  id: 'le-blanc-los-cabos',
  name: 'Le Blanc Spa Resort Los Cabos',
  location: 'Los Cabos, Mexico',
  address: 'Carr. Transpeninsular SJC-CSL. Km. 18.4, Lomas de Tule, San Jose del Cabo, BCS 23400, Mexico',
  phone: '+52-624-163-0100',
  matchers: [
    'le blanc',
    'le blanc los cabos',
    'le blanc spa resort los cabos',
    'leblanc',
    'los cabo',
    'los cabos',
    'cabo',
  ],
  sourceUrls: [
    'https://los-cabos.leblancsparesorts.com/dining',
    'https://los-cabos.leblancsparesorts.com/dining/lumiere',
    'https://los-cabos.leblancsparesorts.com/dining/blanc',
    'https://los-cabos.leblancsparesorts.com/dining/yama',
    'https://los-cabos.leblancsparesorts.com/dining/blanc-pizza',
    'https://los-cabos.leblancsparesorts.com/dining/ocean',
    'https://los-cabos.leblancsparesorts.com/dining/bella',
    'https://los-cabos.leblancsparesorts.com/dining/habibi/',
    'https://los-cabos.leblancsparesorts.com/activities',
    'https://los-cabos.leblancsparesorts.com/experiences',
    'https://los-cabos.leblancsparesorts.com/experiences/cabo-real-golf-course',
    'https://los-cabos.leblancsparesorts.com/faqs',
  ],
  restaurants: [
    {
      id: 'dine-lumiere',
      name: 'Lumiere',
      category: 'French fine dining',
      url: 'https://los-cabos.leblancsparesorts.com/dining/lumiere',
      notes: 'French haute cuisine and the best fit for a special honeymoon dinner. Confirm reservation, dress code, and current menu before counting on it.',
      bookingNote: 'Reserve Lumiere early for the special dinner slot.',
    },
    {
      id: 'dine-ocean',
      name: 'Ocean',
      category: 'Seafood',
      url: 'https://los-cabos.leblancsparesorts.com/dining/ocean',
      notes: 'Seafood-focused resort restaurant with an ocean-view feel. Good for arrival night or a relaxed dinner.',
      bookingNote: 'Confirm availability and whether dinner reservations are needed.',
    },
    {
      id: 'dine-bella',
      name: 'Bella',
      category: 'Italian',
      url: 'https://los-cabos.leblancsparesorts.com/dining/bella',
      notes: 'Italian resort dinner option. A comfortable choice after an activity day.',
      bookingNote: 'Confirm reservation window and dress code.',
    },
    {
      id: 'dine-yama',
      name: 'Yama',
      category: 'Asian',
      url: 'https://los-cabos.leblancsparesorts.com/dining/yama',
      notes: 'Asian cuisine dinner option. Good mid-trip when they want a change of pace.',
      bookingNote: 'Confirm dinner reservation and current menu.',
    },
    {
      id: 'dine-blanc',
      name: 'Blanc',
      category: 'International',
      url: 'https://los-cabos.leblancsparesorts.com/dining/blanc',
      notes: 'International resort restaurant. Useful as a flexible lunch or dinner option.',
      bookingNote: 'Confirm service times in the app or with concierge.',
    },
    {
      id: 'dine-blanc-pizza',
      name: 'Blanc Pizza',
      category: 'Pizza',
      url: 'https://los-cabos.leblancsparesorts.com/dining/blanc-pizza',
      notes: 'Wood-fired pizza option for an easy, lower-effort meal.',
      bookingNote: 'Confirm current hours.',
    },
    {
      id: 'dine-habibi',
      name: 'Habibi',
      category: 'Lebanese',
      url: 'https://los-cabos.leblancsparesorts.com/dining/habibi/',
      notes: 'Lebanese cuisine option listed by Le Blanc. Treat as a good alternate dinner and confirm current English page/menu details.',
      bookingNote: 'Confirm availability and reservation needs.',
    },
    {
      id: 'dine-room-service',
      name: '24-hour in-room dining',
      category: 'Easy meal',
      url: 'https://los-cabos.leblancsparesorts.com/dining',
      notes: 'Useful fallback for arrival night, a slow honeymoon morning, or after a long outside activity.',
    },
  ],
  activities: [
    {
      id: 'act-aura-spa',
      name: 'Aura Spa',
      category: 'Resort wellness',
      url: 'https://los-cabos.leblancsparesorts.com/',
      notes: 'Resort wellness/spa block for a relaxed honeymoon day. Confirm appointment times and any hydrotherapy access details.',
      bookingNote: 'Reserve spa or hydrotherapy time through the resort.',
    },
    {
      id: 'act-blanc-experiences',
      name: 'Blanc Experiences',
      category: 'Resort experiences',
      url: 'https://los-cabos.leblancsparesorts.com/experiences',
      notes: 'Official Le Blanc experiences area for resort/private experiences, expeditions, sporting adventures, and golf excursions.',
      bookingNote: 'Ask concierge which experiences are running during July 19-23.',
    },
    {
      id: 'act-cabo-real-golf',
      name: 'Cabo Real Golf Club',
      category: 'Golf',
      url: 'https://los-cabos.leblancsparesorts.com/experiences/cabo-real-golf-course',
      notes: 'Official Le Blanc golf excursion page describes a Robert Trent Jones Jr. target-style course in desert foothills.',
      bookingNote: 'Book tee time, transportation, club rental, and dress code before the trip.',
    },
    {
      id: 'act-horseback-riding',
      name: 'Horseback riding on the beach',
      category: 'Outside activity',
      notes: 'Priority must-do from Logan and Morgan. Confirm vendor, pickup, park fees, weight limits, and timing before relying on the plan.',
      bookingNote: 'Book horseback riding and confirm transportation.',
    },
    {
      id: 'act-lovers-beach',
      name: 'Lovers Beach / Cabo outing',
      category: 'Outside activity',
      notes: 'Priority must-do from Logan and Morgan. Treat as a flexible Cabo outing and confirm boat/water taxi logistics, weather, and beach conditions.',
      bookingNote: 'Confirm boat or water taxi plan for Lovers Beach.',
    },
    {
      id: 'act-pool-day',
      name: 'Pool and beach downtime',
      category: 'Resort downtime',
      notes: 'Keep at least one slow resort block so the honeymoon does not turn into a checklist.',
    },
  ],
  contacts: [
    {
      id: 'contact-resort',
      name: 'Le Blanc Los Cabos main line',
      category: 'Resort',
      url: 'tel:+526241630100',
      notes: '+52-624-163-0100',
    },
    {
      id: 'contact-pre-arrival',
      name: 'Pre-arrival concierge',
      category: 'Concierge',
      notes: 'prearrivallbcab@leblancsparesorts.com',
    },
  ],
  planningNotes: [
    'Use official Le Blanc pages as the source of truth for resort dining and experiences.',
    'Restaurant availability, menus, service times, and dress codes can change; confirm before booking.',
    'Outside activities should be booked or confirmed with concierge/vendor before relying on them.',
    'Keep the schedule loose because this is a honeymoon, not a conference agenda.',
  ],
}

export const DESTINATION_PACKS: DestinationPack[] = [LE_BLANC_LOS_CABOS]

function normalizeMatcher(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function findDestinationPack(...values: (string | undefined)[]): DestinationPack | undefined {
  const haystack = normalizeMatcher(values.filter(Boolean).join(' '))
  if (!haystack) return undefined
  return DESTINATION_PACKS.find((pack) =>
    pack.matchers.some((matcher) => haystack.includes(normalizeMatcher(matcher))),
  )
}
