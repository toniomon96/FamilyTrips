import { afterEach, describe, expect, it, vi } from 'vitest'
import { listTripsSorted } from '../data/trips'
import type { BudgetItem, Day, EventFoodItem, PackingItem, Trip } from '../types/trip'
import { mergeChecklistStateMaps, rowsToStateMap } from '../hooks/useChecklistState'
import {
  daysUntil,
  formatBudget,
  formatDay,
  formatEventFoodList,
  formatEventInvite,
  formatPackingList,
} from './formatters'
import { packingStateKey, suppliesStateKey } from './packing'
import { validateTripData } from './validateTripData'

afterEach(() => {
  vi.useRealTimers()
})

describe('trip visibility and sorting', () => {
  it('lists only visible trips with upcoming trips sorted by start date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 24, 12))

    const trips = listTripsSorted()

    expect(trips.map((trip) => trip.slug)).toEqual(['okc', 'stpete'])
    expect(trips.some((trip) => trip.slug === 'logan-bachelor')).toBe(false)
  })
})

describe('date helpers', () => {
  it('treats the whole local calendar date as the current day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 24, 23, 59))

    expect(daysUntil('2026-05-24')).toBe(0)
    expect(daysUntil('2026-05-25')).toBe(1)
  })
})

describe('copy formatters', () => {
  it('includes itinerary item links in copied day text', () => {
    const day: Day = {
      date: '2026-05-24',
      items: [
        {
          title: 'Dinner reservation',
          address: '123 Main St',
          notes: 'Bring confirmation.',
          link: 'https://example.com/reservation',
        },
      ],
    }

    expect(formatDay(day)).toContain('https://example.com/reservation')
  })

  it('renders TBD budget items without treating them as zero-dollar costs', () => {
    const items: BudgetItem[] = [
      { id: 'known', name: 'Known stay', total: 300, splitCount: 3 },
      { id: 'tbd', name: 'Tickets', total: 0, splitCount: 3, status: 'tbd' },
    ]

    const text = formatBudget(items, '$')

    expect(text).toContain('Tickets: TBD')
    expect(text).toContain('split 3 ways = $100/share')
    expect(text).toContain('Tracked total: $300')
    expect(text).toContain('Optional/TBD items are excluded from the tracked total.')
  })

  it('renders an all-TBD budget with a TBD summary', () => {
    const items: BudgetItem[] = [
      { id: 'tbd', name: 'Tickets', total: 0, splitCount: 3, status: 'tbd' },
    ]

    const text = formatBudget(items, '$')

    expect(text).toContain('Tickets: TBD')
    expect(text).toContain('excluded from tracked total')
    expect(text).toContain('Tracked total: TBD')
  })

  it('formats budget cents and neutral share labels', () => {
    const items: BudgetItem[] = [
      { id: 'car', name: 'Rental car', total: 376.93, splitCount: 2 },
    ]

    const text = formatBudget(items, '$')

    expect(text).toContain('Rental car: $376.93')
    expect(text).toContain('split 2 ways = $188.47/share')
    expect(text).not.toContain('/person')
  })

  it('labels tracked totals that include estimate items', () => {
    const items: BudgetItem[] = [
      { id: 'known', name: 'Known stay', total: 300, splitCount: 3 },
      { id: 'estimate', name: 'Groceries', total: 90, splitCount: 3, status: 'estimate' },
    ]

    const text = formatBudget(items, '$')

    expect(text).toContain('Tracked total incl. estimates: $390')
    expect(text).toContain('Estimate line items are included in the tracked total.')
  })

  it('pluralizes one-way budget splits correctly', () => {
    const items: BudgetItem[] = [
      { id: 'solo', name: 'Solo item', total: 20, splitCount: 1 },
    ]

    expect(formatBudget(items, '$')).toContain('split 1 way')
  })

  it('formats grouped packing items with quantities, notes, and assignments', () => {
    const items: PackingItem[] = [
      {
        id: 'swimsuit',
        title: 'Swimsuits',
        category: 'Beach / Pool',
        quantity: '2 each',
        packed: true,
      },
      {
        id: 'diapers',
        title: 'Diapers',
        category: 'Baby',
        assignedTo: 'Tatum',
        notes: 'More than you think.',
      },
    ]

    const text = formatPackingList(items, 'OKC Packing')

    expect(text).toContain('🎒 OKC Packing')
    expect(text).toContain('Beach / Pool')
    expect(text).toContain('✔ Swimsuits (2 each)')
    expect(text).toContain('☐ Diapers — Tatum')
    expect(text).toContain('  More than you think.')
  })

  it('namespaces packing state keys away from checklist item ids', () => {
    expect(packingStateKey('pk-docs-id')).toBe('packing:pk-docs-id')
    expect(suppliesStateKey('sup-ice')).toBe('supplies:sup-ice')
  })

  it('formats event invite and food list text', () => {
    const event: Trip = {
      slug: 'event',
      name: 'Family Cookout',
      kind: 'event',
      location: 'Backyard',
      startDate: '2026-07-04',
      endDate: '2026-07-04',
      currency: '$',
      tagline: 'Food and family time.',
      stay: {
        name: 'Backyard at the house',
        address: 'Address in group chat',
        checkIn: '4:00 PM',
        checkOut: '9:00 PM',
        amenities: [],
      },
      bookings: [],
      itinerary: [],
      thingsToDo: [],
      people: [],
      contacts: [],
      checklist: [],
      budget: [],
    }
    const food: EventFoodItem[] = [
      { id: 'burgers', title: 'Burgers', category: 'Grill', quantity: '12', assignedTo: 'Host' },
      { id: 'chips', title: 'Chips', category: 'Sides', notes: 'Any kind.' },
    ]

    expect(formatEventInvite(event)).toContain('🎉 Family Cookout')
    expect(formatEventInvite(event)).toContain('Where: Backyard at the house')
    expect(formatEventFoodList(food, 'Cookout Food')).toContain('• Burgers (12) — Host')
    expect(formatEventFoodList(food, 'Cookout Food')).toContain('  Any kind.')
  })
})

describe('checklist state helpers', () => {
  it('builds a fresh state map without retaining stale trip rows', () => {
    const stale = rowsToStateMap([
      { item_id: 'packing:pk-docs-id', done: true, updated_at: '2026-01-01T00:00:00.000Z', actor_id: null },
    ])

    const next = rowsToStateMap([])

    expect(stale.get('packing:pk-docs-id')?.done).toBe(true)
    expect(next.has('packing:pk-docs-id')).toBe(false)
  })

  it('preserves newer optimistic checklist rows when initial sync returns later', () => {
    const optimistic = rowsToStateMap([
      { item_id: 'ck-golf', done: true, updated_at: '2026-05-14T12:00:01.000Z', actor_id: 'logan' },
    ])
    const initialServerRows = rowsToStateMap([
      { item_id: 'ck-golf', done: false, updated_at: '2026-05-14T12:00:00.000Z', actor_id: null },
      { item_id: 'ck-horseback', done: true, updated_at: '2026-05-14T12:00:00.000Z', actor_id: 'morgan' },
    ])

    const merged = mergeChecklistStateMaps(optimistic, initialServerRows)

    expect(merged.get('ck-golf')?.done).toBe(true)
    expect(merged.get('ck-golf')?.actor_id).toBe('logan')
    expect(merged.get('ck-horseback')?.done).toBe(true)
  })
})

describe('trip data validation', () => {
  it('flags duplicate ids and malformed links in a controlled fixture', () => {
    const trip: Trip = {
      slug: 'bad',
      name: 'Bad fixture',
      location: 'Somewhere',
      startDate: '2026-01-02',
      endDate: '2026-01-01',
      currency: '$',
      stay: {
        name: 'Place',
        address: 'Address',
        checkIn: 'Start',
        checkOut: 'End',
        amenities: [],
      },
      bookings: [],
      itinerary: [{ date: 'not-a-date', items: [{ title: 'Broken link', link: 'not-a-url' }] }],
      thingsToDo: [],
      people: [{ id: 'person', name: 'Person', phone: 'abc' }],
      contacts: [
        { id: 'contact', label: 'Bad URL', value: 'not-a-url', kind: 'url' },
        { id: 'phone', label: 'Bad phone', value: 'abc', kind: 'phone' },
      ],
      checklist: [
        { id: 'dup', title: 'One', category: 'Tasks', done: false },
        { id: 'dup', title: 'Two', category: 'Tasks', done: false },
      ],
      packing: [],
      budget: [],
    }

    const messages = validateTripData([trip]).map((error) => error.message)

    expect(messages).toContain('Start date is after end date.')
    expect(messages).toContain('Duplicate id "dup".')
    expect(messages.some((message) => message.includes('Invalid URL'))).toBe(true)
    expect(messages.some((message) => message.includes('Invalid phone'))).toBe(true)
  })
})
