import type { Task, Poll, Cost } from '../types'

export const TRIP_INFO = {
  name: 'Family Trip 2025',
  location: 'Tuscany, Italy',
  startDate: '2025-07-15',
  endDate: '2025-07-22',
}

export const INITIAL_TASKS: Task[] = [
  // Flights
  { id: 'f1', title: 'Book flights for everyone', category: 'Flights', completed: false },
  { id: 'f2', title: 'Check baggage allowance', category: 'Flights', completed: false },
  { id: 'f3', title: 'Online check-in (24h before)', category: 'Flights', completed: false },
  // Airbnb
  { id: 'a1', title: 'Confirm Airbnb booking', category: 'Airbnb', completed: true },
  { id: 'a2', title: 'Get check-in instructions', category: 'Airbnb', completed: false },
  { id: 'a3', title: 'Share address with everyone', category: 'Airbnb', completed: false },
  // Transportation
  { id: 't1', title: 'Book airport transfers', category: 'Transportation', completed: false },
  { id: 't2', title: 'Rent a car', category: 'Transportation', completed: false },
  // Food
  { id: 'fo1', title: 'Research local restaurants', category: 'Food', completed: false },
  { id: 'fo2', title: 'Book dinner reservation', category: 'Food', completed: false },
  // Wedding
  { id: 'w1', title: 'RSVP to wedding', category: 'Wedding', completed: true },
  { id: 'w2', title: 'Buy wedding gift', category: 'Wedding', completed: false },
  { id: 'w3', title: 'Confirm dress code', category: 'Wedding', completed: false },
  // Baby
  { id: 'b1', title: 'Pack baby essentials', category: 'Baby', completed: false },
  { id: 'b2', title: 'Request baby cot at Airbnb', category: 'Baby', completed: false },
  // Dogs
  { id: 'd1', title: 'Arrange dog sitter', category: 'Dogs', completed: false },
  { id: 'd2', title: 'Pack dog food & supplies', category: 'Dogs', completed: false },
  // Admin
  { id: 'ad1', title: 'Check passport expiry dates', category: 'Admin', completed: false },
  { id: 'ad2', title: 'Get travel insurance', category: 'Admin', completed: false },
  { id: 'ad3', title: 'Notify bank of travel', category: 'Admin', completed: false },
]

export const INITIAL_POLLS: Poll[] = [
  {
    id: 'p1',
    question: 'Which day should we visit the vineyard?',
    options: [
      { id: 'p1o1', text: 'Wednesday July 16', votes: 2 },
      { id: 'p1o2', text: 'Thursday July 17', votes: 3 },
      { id: 'p1o3', text: 'Friday July 18', votes: 1 },
    ],
  },
  {
    id: 'p2',
    question: 'Preferred dinner spot on arrival night?',
    options: [
      { id: 'p2o1', text: 'Local trattoria', votes: 4 },
      { id: 'p2o2', text: 'Cook at Airbnb', votes: 2 },
      { id: 'p2o3', text: 'Pizza place nearby', votes: 1 },
    ],
  },
  {
    id: 'p3',
    question: 'When should we leave for the wedding?',
    options: [
      { id: 'p3o1', text: '30 minutes before', votes: 2 },
      { id: 'p3o2', text: '1 hour before', votes: 5 },
    ],
  },
]

export const INITIAL_COSTS: Cost[] = [
  { name: 'Airbnb (7 nights)', total: 2800, splitCount: 5 },
  { name: 'Car Rental', total: 420, splitCount: 5 },
  { name: 'Groceries Budget', total: 300, splitCount: 5 },
  { name: 'Wedding Gift (shared)', total: 200, splitCount: 5 },
]
