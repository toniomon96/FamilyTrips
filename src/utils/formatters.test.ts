import { afterEach, describe, expect, it, vi } from 'vitest'
import { listTripsSorted } from '../data/trips'
import type { BudgetItem, Day, PackingItem } from '../types/trip'
import { daysUntil, formatBudget, formatDay, formatPackingList } from './formatters'
import { packingStateKey } from './packing'

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
    expect(text).toContain('split 3 ways')
    expect(text).toContain('Total: $300')
    expect(text).toContain('Your share: $100')
  })

  it('renders an all-TBD budget with a TBD summary', () => {
    const items: BudgetItem[] = [
      { id: 'tbd', name: 'Tickets', total: 0, splitCount: 3, status: 'tbd' },
    ]

    const text = formatBudget(items, '$')

    expect(text).toContain('Tickets: TBD')
    expect(text).toContain('split 3 ways')
    expect(text).toContain('Total: TBD')
    expect(text).toContain('Your share: TBD')
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
  })
})
