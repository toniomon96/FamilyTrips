import type { Trip } from '../../types/trip'

export const okc: Trip = {
  slug: 'okc',
  name: 'Morgan’s 25th — WCWS Weekend',
  location: 'Oklahoma City, OK',
  startDate: '2026-05-28',
  endDate: '2026-05-31',
  currency: '$',
  tagline: 'Morgan’s 25th birthday + Women’s College World Series',

  stay: {
    name: 'TBD — booking in progress',
    address: 'Oklahoma City, OK',
    checkIn: 'May 28, 2026 · TBD',
    checkOut: 'May 31, 2026 · TBD',
    amenities: [],
    notes:
      'Hotel vs Airbnb still being decided. Must fit 6 adults + Tatum (infant).\n' +
      'Aim for something near Bricktown or within easy drive of Devon Park (the WCWS venue).',
  },

  bookings: [
    {
      id: 'drive',
      kind: 'car',
      title: 'Drive from Dallas → OKC',
      details:
        'Toni, Morgan, Tatum driving up from Dallas. ~3 hr 15 min each way. ' +
        'Tony & Leah plan TBD (likely driving up too). Mark & Laura plan TBD.',
      when: '2026-05-28',
    },
    {
      id: 'wcws',
      kind: 'activity',
      title: 'Women’s College World Series — Devon Park',
      details:
        'USA Softball Hall of Fame Stadium · 2801 NE 50th St, Oklahoma City, OK. ' +
        'Plan is to catch a few games across the weekend. Exact sessions/tickets TBD.',
      when: '2026-05-29',
    },
    {
      id: 'bday',
      kind: 'activity',
      title: 'Morgan’s 25th birthday dinner',
      details:
        'Surprise dinner for Morgan — venue TBD. Keep quiet in front of Morgan. ' +
        'Coordinate gift/photo plan with the group ahead of time.',
      when: '2026-05-30',
    },
  ],

  itinerary: [
    {
      date: '2026-05-28',
      title: 'Arrival · Bricktown evening',
      items: [
        { title: 'Drive from Dallas', notes: '~3 hr 15 min via I-35 N. Stop for lunch on the way.' },
        { title: 'Check in at the stay', notes: 'Confirm check-in time once booking is locked.' },
        { title: 'Dinner in Bricktown', notes: 'Walk the canal. Good stroller terrain for Tatum.' },
      ],
    },
    {
      date: '2026-05-29',
      title: 'WCWS Day 1',
      items: [
        { title: 'Morning: slow start', notes: 'Breakfast near the stay.' },
        { title: 'WCWS game at Devon Park', address: '2801 NE 50th St, Oklahoma City, OK', notes: 'Hats, sunscreen, water. Check session times.' },
        { title: 'Dinner — TBD' },
      ],
    },
    {
      date: '2026-05-30',
      title: 'Morgan’s birthday 🎂',
      items: [
        { title: 'Birthday morning with Morgan' },
        { title: 'WCWS game (or second session)', address: '2801 NE 50th St, Oklahoma City, OK' },
        { title: 'Surprise birthday dinner', notes: 'Venue TBD — lock in a reservation once decided. Keep quiet in front of Morgan.' },
      ],
    },
    {
      date: '2026-05-31',
      title: 'Farewell · drive home',
      items: [
        { title: 'Pack up and check out' },
        { title: 'Brunch before hitting the road' },
        { title: 'Drive back to Dallas', notes: '~3 hr 15 min. Share ETA in the group chat.' },
      ],
    },
  ],

  thingsToDo: [
    { id: 'td-wcws', name: 'USA Softball Hall of Fame Stadium / Devon Park', category: 'Sports', address: '2801 NE 50th St, Oklahoma City, OK', url: 'https://maps.google.com/?q=USA+Softball+Hall+of+Fame+Stadium', notes: 'Host of the Women’s College World Series.' },
    { id: 'td-bricktown', name: 'Bricktown', category: 'District', address: 'Bricktown, Oklahoma City, OK', url: 'https://maps.google.com/?q=Bricktown+Oklahoma+City', notes: 'Canal, restaurants, walkable — good for strolling.' },
    { id: 'td-cowboy', name: 'National Cowboy & Western Heritage Museum', category: 'Museum', address: '1700 NE 63rd St, Oklahoma City, OK', url: 'https://nationalcowboymuseum.org/', notes: 'Easy to pair with a Devon Park day — they’re close.' },
    { id: 'td-memorial', name: 'Oklahoma City National Memorial & Museum', category: 'Memorial', address: '620 N Harvey Ave, Oklahoma City, OK', url: 'https://memorialmuseum.com/' },
    { id: 'td-scissortail', name: 'Scissortail Park', category: 'Park', address: '300 SW 7th St, Oklahoma City, OK', url: 'https://maps.google.com/?q=Scissortail+Park', notes: 'Great with a stroller.' },
  ],

  people: [
    { id: 'p-toni', name: 'Toni Montez', role: 'Organizer · birthday husband', phone: '+1 469 371 9091' },
    { id: 'p-morgan', name: 'Morgan Montez', role: 'Birthday girl (turning 25) 🎂', phone: '+1 256 727 2388' },
    { id: 'p-tatum', name: 'Tatum Montez', role: 'Daughter (infant)' },
    { id: 'p-tony', name: 'Tony Montez', role: 'Dad', phone: '+1 469 865 0500' },
    { id: 'p-leah', name: 'Leah Montez', role: 'Mom', phone: '+1 214 475 1376' },
    { id: 'p-mark', name: 'Mark Goodwin', role: 'Father-in-law', phone: '+1 256 595 2643' },
    { id: 'p-laura', name: 'Laura Goodwin', role: 'Mother-in-law', phone: '+1 256 595 1636' },
  ],

  contacts: [
    { id: 'c-emerg', label: 'Emergency (US)', value: '911', kind: 'phone' },
    { id: 'c-devon', label: 'USA Softball Hall of Fame Stadium (Devon Park)', value: 'https://maps.google.com/?q=USA+Softball+Hall+of+Fame+Stadium', kind: 'url' },
  ],

  checklist: [
    // Stay
    { id: 'ck-st-1', title: 'Decide hotel vs Airbnb', category: 'Stay', done: false },
    { id: 'ck-st-2', title: 'Book the stay', category: 'Stay', done: false, notes: 'Needs to fit 6 adults + pack & play for Tatum.' },
    { id: 'ck-st-3', title: 'Confirm check-in time', category: 'Stay', done: false },
    { id: 'ck-st-4', title: 'Share address + parking info with the group', category: 'Stay', done: false },

    // Transport (driving trip)
    { id: 'ck-tr-1', title: 'Install infant car seat', category: 'Transport', done: false },
    { id: 'ck-tr-2', title: 'Oil change / tire check before the drive', category: 'Transport', done: false },
    { id: 'ck-tr-3', title: 'Gas up the night before', category: 'Transport', done: false },
    { id: 'ck-tr-4', title: 'Road snacks + drinks', category: 'Transport', done: false },
    { id: 'ck-tr-5', title: 'Stroller in the trunk', category: 'Transport', done: false },
    { id: 'ck-tr-6', title: 'Confirm parents’ travel plans (Tony/Leah, Mark/Laura)', category: 'Transport', done: false, notes: 'Who’s driving from where, arrival times, any carpool.' },

    // Tickets
    { id: 'ck-ti-1', title: 'Pick which WCWS sessions to attend', category: 'Tickets', done: false },
    { id: 'ck-ti-2', title: 'Buy WCWS tickets', category: 'Tickets', done: false, notes: 'Try to seat everyone together.' },
    { id: 'ck-ti-3', title: 'Save tickets to phones', category: 'Tickets', done: false },

    // Baby (Tatum)
    { id: 'ck-ba-1', title: 'Pack & play', category: 'Baby', done: false },
    { id: 'ck-ba-2', title: 'Bottles + formula/feeding supplies', category: 'Baby', done: false },
    { id: 'ck-ba-3', title: 'Diapers + wipes (more than you think)', category: 'Baby', done: false },
    { id: 'ck-ba-4', title: 'Sun hat + baby sunscreen (day games at Devon Park)', category: 'Baby', done: false },
    { id: 'ck-ba-5', title: 'Stroller for Bricktown/park walks', category: 'Baby', done: false },

    // Birthday (surprise for Morgan)
    { id: 'ck-bd-1', title: 'Lock in birthday dinner venue', category: 'Birthday', done: false, notes: 'Keep quiet around Morgan.' },
    { id: 'ck-bd-2', title: 'Cake or dessert plan', category: 'Birthday', done: false },
    { id: 'ck-bd-3', title: 'Gift(s)', category: 'Birthday', done: false },
    { id: 'ck-bd-4', title: 'Photo / group toast plan', category: 'Birthday', done: false },
    { id: 'ck-bd-5', title: 'Align the family so nobody spoils the surprise', category: 'Birthday', done: false },

    // Admin
    { id: 'ck-ad-1', title: 'Share address + ETAs in the group chat', category: 'Admin', done: false },
    { id: 'ck-ad-2', title: 'Share emergency contact list', category: 'Admin', done: false, notes: 'Tap "Copy everyone" on the People page.' },
  ],

  budget: [
    { id: 'b-stay', name: 'Hotel / Airbnb (estimate)', total: 800, splitCount: 6, notes: 'Placeholder — update once booked.' },
    { id: 'b-tix', name: 'WCWS tickets (estimate)', total: 400, splitCount: 6, notes: 'Placeholder — update when sessions chosen.' },
    { id: 'b-gas', name: 'Gas round-trip (Dallas ⇄ OKC)', total: 120, splitCount: 6 },
    { id: 'b-food', name: 'Food & activities (estimate)', total: 400, splitCount: 6, notes: 'Birthday dinner + game-day food + coffee stops.' },
  ],
}
