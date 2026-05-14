export type BookingKind = 'flight' | 'stay' | 'car' | 'activity' | 'other'

export type PlanKind = 'trip' | 'event'
export type PlanItemStatus = 'confirmed' | 'suggested' | 'needs-booking' | 'needs-confirmation'
export type DraftStrength = 'weak' | 'medium' | 'strong'
export type PlannerSourceKind = 'official' | 'user-provided' | 'search' | 'curated' | 'inferred'

export type PlannerSourceRef = {
  id: string
  title: string
  url?: string
  kind: PlannerSourceKind
  note?: string
}

export type PlannerAnnotated = {
  status?: PlanItemStatus
  why?: string
  nextStep?: string
  sourceIds?: string[]
}

export type PlannerExplained = {
  why?: string
  nextStep?: string
  sourceIds?: string[]
}

export type Booking = PlannerAnnotated & {
  id: string
  kind: BookingKind
  title: string
  details?: string
  link?: string
  confirmation?: string
  when?: string
}

export type Stay = {
  name: string
  address: string
  checkIn: string
  checkOut: string
  wifiSsid?: string
  wifiPassword?: string
  amenities: string[]
  notes?: string
  bookingLink?: string
  confirmation?: string
  hostName?: string
  hostPhone?: string
}

export type ItineraryItem = PlannerAnnotated & {
  time?: string
  title: string
  notes?: string
  address?: string
  link?: string
}

export type Day = {
  date: string
  title?: string
  items: ItineraryItem[]
}

export type Activity = PlannerAnnotated & {
  id: string
  name: string
  category?: string
  address?: string
  url?: string
  notes?: string
}

export type Person = {
  id: string
  name: string
  role?: string
  phone?: string
  arriving?: string
  leaving?: string
}

export type ContactKind = 'phone' | 'url' | 'text'

export type Contact = {
  id: string
  label: string
  value: string
  kind?: ContactKind
  notes?: string
}

export type ChecklistItem = PlannerAnnotated & {
  id: string
  title: string
  category: string
  done: boolean
  notes?: string
}

export type PackingItem = PlannerAnnotated & {
  id: string
  title: string
  category: string
  packed?: boolean
  quantity?: string
  notes?: string
  assignedTo?: string
}

export type EventFoodItem = {
  id: string
  title: string
  category: string
  quantity?: string
  assignedTo?: string
  notes?: string
}

export type CopyBlock = PlannerAnnotated & {
  id: string
  title: string
  body: string
}

export type BudgetItem = PlannerExplained & {
  id: string
  name: string
  total: number
  splitCount: number
  status?: 'confirmed' | 'estimate' | 'tbd'
  notes?: string
}

export type Trip = {
  slug: string
  kind?: PlanKind
  name: string
  location: string
  startDate: string
  endDate: string
  visibility?: 'listed' | 'unlisted'
  heroImage?: string
  currency: string
  tagline?: string
  stay: Stay
  bookings: Booking[]
  itinerary: Day[]
  thingsToDo: Activity[]
  people: Person[]
  contacts: Contact[]
  checklist: ChecklistItem[]
  packing?: PackingItem[]
  food?: EventFoodItem[]
  supplies?: PackingItem[]
  eventTasks?: ChecklistItem[]
  copyBlocks?: CopyBlock[]
  budget: BudgetItem[]
  planner?: {
    draftStrength: DraftStrength
    warnings: string[]
    missingInputs: string[]
    generatedAt: string
    sourceMode: 'deterministic' | 'curated' | 'search' | 'ai' | 'ai-fallback'
    sourceRefs: PlannerSourceRef[]
    questions?: string[]
    notes?: string[]
  }
  map?: {
    embedUrl?: string
    center?: { lat: number; lng: number }
  }
}
