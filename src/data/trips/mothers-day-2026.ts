import type { Trip } from '../../types/trip'

export const mothersDay2026: Trip = {
  slug: 'mothers-day-2026',
  kind: 'event',
  visibility: 'unlisted',
  name: "Mother's Day 2026",
  location: 'McKinney, TX',
  startDate: '2026-05-09',
  endDate: '2026-05-10',
  currency: '$',
  tagline: "A relaxed two-day plan honoring Mom and Morgan, with Morgan's chill protected.",

  stay: {
    name: 'Our house',
    address: 'Shared privately with the family',
    checkIn: 'Sunday, May 10, 2026 · 2:00 PM cookout starts',
    checkOut: 'Sunday, May 10, 2026 · Evening wind down',
    amenities: ['Backyard', 'Grill', 'Outdoor seating', 'Cooler', 'Speaker', 'Family games'],
    notes:
      'Mother\'s Day cookout starts at 2:00 PM. The weekend stays low-pressure: family time, easy favorites, and Morgan off-duty.',
  },

  bookings: [
    {
      id: 'booking-common-table',
      kind: 'activity',
      title: 'The Common Table brunch',
      details: 'Need to confirm reservation, exact time, party size, and whether Tatum is coming.',
      when: 'Saturday, May 9, 2026 · Late morning',
    },
  ],

  itinerary: [
    {
      date: '2026-05-09',
      title: "Saturday - Morgan's low-pressure day",
      items: [
        {
          time: 'Morning',
          title: 'Let Morgan sleep in',
          notes: 'Easy coffee at home. Toni takes Tatum duty.',
        },
        {
          time: 'Late morning',
          title: 'Brunch at The Common Table',
          notes: 'Confirm reservation, time, party size, and whether Tatum is coming.',
        },
        {
          time: 'Afternoon',
          title: 'Chill at home',
          notes: 'Movie, nap, yard, or whatever Morgan wants. Tatum stays on Toni.',
        },
        {
          time: 'Evening',
          title: "Dinner at Chili's",
          notes: "Morgan's pick. No reservation needed.",
        },
        {
          time: 'Night',
          title: 'Wind down and make banana pudding',
          notes: 'Make it Saturday night so it sets overnight.',
        },
      ],
    },
    {
      date: '2026-05-10',
      title: "Sunday - Mother's Day",
      items: [
        {
          time: 'Morning',
          title: "Breakfast at Braum's",
          notes: "Morgan's pick.",
        },
        {
          time: 'Mid-morning',
          title: "Give Morgan Tatum's birthstone gift",
          notes: 'Do the reveal with Tatum present before the cookout prep starts.',
        },
        {
          time: 'Late morning',
          title: 'Prep yard, grill, and supplies',
          notes: 'Morgan relaxes while Toni handles logistics.',
        },
        {
          time: '2:00 PM',
          title: 'Cookout starts',
          address: 'Address shared privately with the family',
          notes: 'Family arrives. Eat, hang out, and play whatever games the moms pick.',
        },
        {
          time: 'Evening',
          title: 'Wind down',
          notes: 'Family heads out. Morgan stays off-duty.',
        },
      ],
    },
  ],

  thingsToDo: [
    {
      id: 'td-common-table',
      name: 'The Common Table',
      category: 'Saturday brunch',
      notes: 'Confirm reservation early because Mother\'s Day weekend brunch is high demand.',
    },
    {
      id: 'td-chilis',
      name: "Chili's",
      category: 'Saturday dinner',
      notes: "Morgan's pick, low effort, no reservation needed.",
    },
    {
      id: 'td-braums',
      name: "Braum's",
      category: 'Sunday breakfast',
      notes: "Morgan's pick before the gift reveal and cookout prep.",
    },
    {
      id: 'td-yard-games',
      name: 'Mom-picked games',
      category: 'Cookout',
      notes: 'Ask Morgan and Mom what they actually want to play, then stage those games Sunday morning.',
    },
  ],

  people: [
    { id: 'p-toni', name: 'Toni / Antonio', role: 'Host, logistics, cooking, chores, Tatum duty' },
    { id: 'p-morgan', name: 'Morgan', role: "Being celebrated as Tatum's mom" },
    { id: 'p-mom', name: 'Mom', role: 'Being celebrated' },
    { id: 'p-dad', name: 'Dad', role: 'Bringing butcher burger patties and sausage / brats' },
    { id: 'p-mario', name: 'Mario', role: 'Brother' },
    { id: 'p-tatum', name: 'Tatum ("TayTay")', role: 'Daughter' },
  ],

  contacts: [
    { id: 'c-common-table', label: 'The Common Table reservation', value: 'Confirm time and party size', kind: 'text' },
    { id: 'c-florist', label: 'Flowers', value: 'Order online for Saturday May 9 delivery', kind: 'text' },
    { id: 'c-emergency', label: 'Emergency (US)', value: '911', kind: 'phone' },
  ],

  checklist: [],

  eventTasks: [
    { id: 'task-flowers-mom', title: 'Order flowers for Mom, deliver Saturday May 9', category: 'Gifts & flowers', done: false },
    { id: 'task-flowers-morgan', title: 'Order flowers for Morgan, deliver Saturday May 9 or Sunday AM', category: 'Gifts & flowers', done: false },
    { id: 'task-card-mom', title: 'Buy and write card for Mom', category: 'Gifts & flowers', done: false },
    { id: 'task-card-morgan', title: 'Buy and write card for Morgan from Toni + Tatum', category: 'Gifts & flowers', done: false },
    { id: 'task-wrap-mom', title: "Wrap Mom's gift by Saturday night", category: 'Gifts & flowers', done: false },
    { id: 'task-wrap-morgan', title: "Wrap Morgan's birthstone gift by Saturday night", category: 'Gifts & flowers', done: false },
    { id: 'task-reservation', title: 'Confirm The Common Table reservation, exact time, and party size', category: 'Saturday prep', done: false },
    { id: 'task-confirm-people', title: 'Confirm everyone joining brunch and cookout', category: 'Saturday prep', done: false },
    { id: 'task-tatum-brunch', title: 'Decide if Tatum is coming to brunch or staying with a sitter', category: 'Saturday prep', done: false },
    { id: 'task-grocery-run', title: 'Saturday grocery run for cookout supplies', category: 'Saturday prep', done: false },
    { id: 'task-pudding', title: 'Make banana pudding Saturday night', category: 'Saturday prep', done: false },
    { id: 'task-laundry', title: "Laundry caught up, especially Morgan's and Tatum's", category: 'Friday chores', done: false },
    { id: 'task-kitchen', title: 'Dishwasher empty and kitchen reset', category: 'Friday chores', done: false },
    { id: 'task-bathrooms', title: 'Bathrooms cleaned, especially guest bath', category: 'Friday chores', done: false },
    { id: 'task-floors', title: 'Vacuum / sweep main living areas', category: 'Friday chores', done: false },
    { id: 'task-trash', title: 'Trash and recycling out', category: 'Friday chores', done: false },
    { id: 'task-yard-saturday', title: 'Yard / patio swept and furniture wiped', category: 'Saturday chores', done: false },
    { id: 'task-final-tidy', title: 'Final tidy Sunday morning', category: 'Sunday AM setup', done: false },
    { id: 'task-seating', title: 'Set up outdoor seating, shade, and tablecloths', category: 'Sunday AM setup', done: false },
    { id: 'task-cooler', title: 'Set up drinks cooler with lots of ice', category: 'Sunday AM setup', done: false },
    { id: 'task-grill', title: 'Prep grill and confirm charcoal or propane backup', category: 'Sunday AM setup', done: false },
    { id: 'task-music', title: 'Speaker and playlist ready', category: 'Sunday AM setup', done: false },
    { id: 'task-games', title: 'Stage games after asking Morgan and Mom what they want', category: 'Sunday AM setup', done: false },
    { id: 'task-tatum-ready', title: 'Tatum dressed, fed, and ready', category: 'Sunday AM setup', done: false },
  ],

  supplies: [
    { id: 'sup-burger-buns', title: 'Burger buns', category: 'Burger fixings', notes: "Confirm Dad isn't bringing them; host usually covers." },
    { id: 'sup-cheese', title: 'Sliced cheese', category: 'Burger fixings', quantity: 'American, cheddar, pepper jack' },
    { id: 'sup-lettuce-tomato-onion', title: 'Lettuce, tomato, red onion, pickles', category: 'Burger fixings' },
    { id: 'sup-condiments', title: 'Ketchup, yellow mustard, mayo, BBQ sauce', category: 'Burger fixings' },
    { id: 'sup-hot-dog-buns', title: 'Hot dog buns', category: 'Hot dog / brat fixings' },
    { id: 'sup-sauerkraut', title: 'Sauerkraut', category: 'Hot dog / brat fixings', notes: 'For the brats.' },
    { id: 'sup-spicy-mustard', title: 'Spicy / dijon mustard', category: 'Hot dog / brat fixings' },
    { id: 'sup-relish', title: 'Sweet relish', category: 'Hot dog / brat fixings' },
    { id: 'sup-onions', title: 'Sliced onions', category: 'Hot dog / brat fixings', notes: 'Raw onions plus a tray to saute with brats.' },
    { id: 'sup-potato-salad', title: 'Potato salad', category: 'Sides to pick', notes: 'Pick 2-3 sides total; do not overdo it.' },
    { id: 'sup-coleslaw', title: 'Coleslaw', category: 'Sides to pick' },
    { id: 'sup-baked-beans', title: 'Baked beans', category: 'Sides to pick' },
    { id: 'sup-watermelon', title: 'Watermelon', category: 'Sides to pick', notes: 'In season and easy.' },
    { id: 'sup-veggie-tray', title: 'Veggie tray + ranch', category: 'Sides to pick', notes: 'Gives the moms a lighter option.' },
    { id: 'sup-wafers', title: 'Vanilla wafers', category: 'Banana pudding' },
    { id: 'sup-bananas', title: 'Ripe bananas', category: 'Banana pudding' },
    { id: 'sup-pudding-mix', title: 'Vanilla pudding mix or instant', category: 'Banana pudding' },
    { id: 'sup-condensed-milk', title: 'Sweetened condensed milk', category: 'Banana pudding' },
    { id: 'sup-cool-whip', title: 'Cool Whip or whipping cream', category: 'Banana pudding' },
    { id: 'sup-water', title: 'Bottled water', category: 'Drinks' },
    { id: 'sup-sodas', title: 'Sodas', category: 'Drinks', notes: 'Variety.' },
    { id: 'sup-beer', title: 'Beer', category: 'Drinks' },
    { id: 'sup-wine', title: 'Wine', category: 'Drinks', notes: 'Something Morgan and Mom like.' },
    { id: 'sup-tatum-drinks', title: 'Juice / milk for Tatum', category: 'Drinks' },
    { id: 'sup-coffee', title: 'Coffee for after the meal', category: 'Drinks', notes: 'Older folks appreciate this.' },
    { id: 'sup-ice', title: 'Ice', category: 'Non-food supplies', quantity: 'Lots' },
    { id: 'sup-cooler', title: 'Cooler for outdoor drinks', category: 'Non-food supplies' },
    { id: 'sup-paper-goods', title: 'Plates, cups, utensils, napkins', category: 'Non-food supplies', notes: 'Paper for easy cleanup.' },
    { id: 'sup-solo-cups', title: 'Solo cups for drinks', category: 'Non-food supplies' },
    { id: 'sup-paper-towels', title: 'Paper towels', category: 'Non-food supplies' },
    { id: 'sup-foil', title: 'Aluminum foil', category: 'Non-food supplies' },
    { id: 'sup-leftovers', title: 'Ziplocks / containers for leftovers', category: 'Non-food supplies' },
    { id: 'sup-trash-bags', title: 'Trash bags + extra bin outside', category: 'Non-food supplies' },
    { id: 'sup-grill-tools', title: 'Tongs, spatula, grill brush, instant-read thermometer', category: 'Non-food supplies' },
    { id: 'sup-fuel', title: 'Charcoal or propane check with backup tank', category: 'Non-food supplies' },
    { id: 'sup-lighter', title: 'Lighter / matches if charcoal', category: 'Non-food supplies' },
    { id: 'sup-bug-spray', title: 'Bug spray + citronella', category: 'Non-food supplies', notes: 'May in Texas means mosquitos at dusk.' },
    { id: 'sup-sunscreen', title: 'Sunscreen', category: 'Non-food supplies', notes: 'In case people sit in sun.' },
    { id: 'sup-tablecloths', title: 'Tablecloths', category: 'Non-food supplies', notes: 'Easy cleanup.' },
    { id: 'sup-speaker', title: 'Outdoor speaker + playlist', category: 'Non-food supplies' },
    { id: 'sup-tatum-kit', title: 'Kid plate, sippy cup, snacks, sunhat', category: 'Tatum-specific' },
  ],

  food: [
    { id: 'food-dad-burgers', title: 'Burger patties from the butcher', category: 'Dad is bringing', assignedTo: 'Dad', notes: 'Mom loves grilled burgers.' },
    { id: 'food-dad-sausage', title: 'Sausage / brats', category: 'Dad is bringing', assignedTo: 'Dad' },
    { id: 'food-toni-hot-dogs', title: 'Hot dogs', category: 'Toni is bringing', assignedTo: 'Toni' },
    { id: 'food-toni-pudding', title: 'Banana pudding', category: 'Toni is bringing', assignedTo: 'Toni', notes: 'Make Saturday night so it sets overnight.' },
    { id: 'food-toni-chips', title: 'Potato chips + dip', category: 'Toni is bringing', assignedTo: 'Toni' },
  ],

  copyBlocks: [
    {
      id: 'copy-boundary',
      title: 'Weekend boundary',
      body: 'No Hub work. No app building. No agent prompts. No engineering. Phone away when possible. Fully present for Morgan, Tatum, and the family.',
    },
    {
      id: 'copy-cookout',
      title: 'Cookout summary',
      body: "Mother's Day cookout Sunday May 10 at 2:00 PM. Address is shared privately with the family. Dad is bringing butcher burger patties and sausage/brats. Toni has hot dogs, banana pudding, chips, dip, setup, grill, drinks, and cleanup.",
    },
  ],

  budget: [],
}
