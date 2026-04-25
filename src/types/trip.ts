export type BookingKind = 'flight' | 'stay' | 'car' | 'activity' | 'other'

export type Booking = {
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

export type ItineraryItem = {
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

export type Activity = {
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

export type ChecklistItem = {
  id: string
  title: string
  category: string
  done: boolean
  notes?: string
}

export type BudgetItem = {
  id: string
  name: string
  total: number
  splitCount: number
  status?: 'confirmed' | 'estimate' | 'tbd'
  notes?: string
}

export type Trip = {
  slug: string
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
  budget: BudgetItem[]
  map?: {
    embedUrl?: string
    center?: { lat: number; lng: number }
  }
}
