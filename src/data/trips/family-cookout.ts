import type { Trip } from '../../types/trip'

export const familyCookout: Trip = {
  slug: 'family-cookout',
  kind: 'event',
  visibility: 'unlisted',
  name: 'Family Cookout',
  location: 'Backyard',
  startDate: '2026-07-04',
  endDate: '2026-07-04',
  currency: '$',
  tagline: 'A simple backyard get-together with food, games, and family time.',

  stay: {
    name: 'Backyard at the house',
    address: 'Address shared in the group chat',
    checkIn: 'Saturday, July 4, 2026 · 4:00 PM',
    checkOut: 'Saturday, July 4, 2026 · 9:00 PM',
    amenities: ['Backyard', 'Grill', 'Coolers', 'Driveway parking'],
    notes: 'Bring a chair if you have one. Text the group chat if you need the address.',
  },

  bookings: [],

  itinerary: [
    {
      date: '2026-07-04',
      title: 'Cookout plan',
      items: [
        { time: '2:30 PM', title: 'Setup starts', notes: 'Tables, coolers, trash bags, chairs, speaker.' },
        { time: '4:00 PM', title: 'People start arriving' },
        { time: '5:00 PM', title: 'Grill food' },
        { time: '6:30 PM', title: 'Dessert and birthday shout-outs', notes: 'Keep it casual.' },
        { time: '8:30 PM', title: 'Start cleanup', notes: 'Pack leftovers and take trash out before everyone leaves.' },
      ],
    },
  ],

  thingsToDo: [
    { id: 'td-yard-games', name: 'Yard games', category: 'Games', notes: 'Cornhole, football, bubbles, sidewalk chalk.' },
    { id: 'td-kids-table', name: 'Kids table', category: 'Setup', notes: 'Paper, markers, snacks, and water nearby.' },
  ],

  people: [
    { id: 'p-host', name: 'Host', role: 'Setup / grill' },
    { id: 'p-family', name: 'Family', role: 'Guests' },
  ],

  contacts: [
    { id: 'c-host', label: 'Host', value: 'Text the group chat', kind: 'text' },
    { id: 'c-emerg', label: 'Emergency (US)', value: '911', kind: 'phone' },
  ],

  checklist: [],

  eventTasks: [
    { id: 'et-shop-meat', title: 'Buy burgers / hot dogs', category: 'Shopping', done: false },
    { id: 'et-shop-ice', title: 'Buy ice', category: 'Shopping', done: false },
    { id: 'et-clean-yard', title: 'Clean patio / yard', category: 'Setup', done: false },
    { id: 'et-set-coolers', title: 'Set coolers and drinks out', category: 'Setup', done: false },
    { id: 'et-trash', title: 'Set out trash bags and paper towels', category: 'Setup', done: false },
    { id: 'et-leftovers', title: 'Pack leftovers', category: 'Cleanup', done: false },
  ],

  supplies: [
    { id: 'sup-chairs', title: 'Folding chairs', category: 'Setup', quantity: 'As many as people can bring' },
    { id: 'sup-coolers', title: 'Coolers', category: 'Food & Drinks', quantity: '2' },
    { id: 'sup-ice', title: 'Ice', category: 'Food & Drinks', quantity: '3 bags' },
    { id: 'sup-plates', title: 'Paper plates / napkins / utensils', category: 'Food & Drinks' },
    { id: 'sup-speaker', title: 'Bluetooth speaker', category: 'Setup' },
    { id: 'sup-games', title: 'Yard games', category: 'Games' },
  ],

  food: [
    { id: 'food-burgers', title: 'Burgers', category: 'Grill', quantity: 'Enough for the group', assignedTo: 'Host' },
    { id: 'food-hot-dogs', title: 'Hot dogs', category: 'Grill', assignedTo: 'Host' },
    { id: 'food-buns', title: 'Buns', category: 'Grill' },
    { id: 'food-chips', title: 'Chips / dips', category: 'Sides', assignedTo: 'Whoever wants to grab them' },
    { id: 'food-dessert', title: 'Dessert', category: 'Dessert', notes: 'Cake, cookies, or whatever is easiest.' },
    { id: 'food-drinks', title: 'Drinks', category: 'Drinks', notes: 'Water, sodas, and anything else people want.' },
  ],

  copyBlocks: [
    {
      id: 'copy-invite',
      title: 'Invite text',
      body:
        'Family cookout Saturday, July 4 at 4:00 PM. We’ll grill around 5:00. Bring a chair if you have one, and text the group chat if you need the address.',
    },
    {
      id: 'copy-bring',
      title: 'What to bring',
      body:
        'Helpful things to bring: folding chairs, chips/dips, drinks, yard games, and anything specific your family wants.',
    },
  ],

  budget: [
    { id: 'b-food', name: 'Food and drinks', total: 200, splitCount: 4, status: 'estimate' },
    { id: 'b-supplies', name: 'Plates, napkins, ice, supplies', total: 50, splitCount: 4, status: 'estimate' },
  ],
}
