import type { ChecklistItem } from '../types/trip'

/**
 * Baseline dog checklist every trip inherits. Covers the stages we consistently
 * forget — deciding the plan first, then booking, prep, drop-off, pick-up.
 * Trips spread this into their own checklist and can customize done / notes
 * or add trip-specific extras on top.
 */
export function dogChecklistItems(): ChecklistItem[] {
  return [
    { id: 'ck-dog-plan', title: 'Decide the care plan (board / sitter / family)', category: 'Dogs', done: false, notes: 'Lock this in first — it blocks everything else.' },
    { id: 'ck-dog-book', title: 'Book boarder or sitter for exact trip dates', category: 'Dogs', done: false, notes: 'Confirm drop-off + pick-up times in writing.' },
    { id: 'ck-dog-vax', title: 'Confirm vaccinations are current', category: 'Dogs', done: false, notes: 'Boarders require proof — upload records ahead of time.' },
    { id: 'ck-dog-food', title: 'Pack food for the full stay + 1 extra day', category: 'Dogs', done: false, notes: 'Measure daily portions so the sitter doesn’t have to.' },
    { id: 'ck-dog-meds', title: 'Pack medications (daily meds, flea/tick, heartworm)', category: 'Dogs', done: false },
    { id: 'ck-dog-gear', title: 'Pack leashes, collars, tags, harness, favorite toy, bed', category: 'Dogs', done: false },
    { id: 'ck-dog-instructions', title: 'Write up care instructions', category: 'Dogs', done: false, notes: 'Feeding schedule, walk routine, our phones, emergency vet — send to whoever has them.' },
    { id: 'ck-dog-dropoff', title: 'Drop off dogs', category: 'Dogs', done: false },
    { id: 'ck-dog-pickup', title: 'Pick up dogs on return', category: 'Dogs', done: false },
  ]
}
