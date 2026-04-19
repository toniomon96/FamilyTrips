import type { Trip } from '../../types/trip'
import heroImage from '../../assets/hero.png'

export const tuscany: Trip = {
  slug: 'tuscany',
  name: 'Family Trip 2025',
  location: 'Tuscany, Italy',
  startDate: '2025-07-15',
  endDate: '2025-07-22',
  heroImage,
  currency: '€',
  tagline: 'A week in Tuscany for the wedding',

  stay: {
    name: 'Villa del Sole',
    address: 'Via del Sole 12, 53024 Montalcino SI, Italy',
    checkIn: 'July 15, 2025 · 3:00 PM',
    checkOut: 'July 22, 2025 · 11:00 AM',
    wifiSsid: 'VillaDelSole_Guest',
    wifiPassword: 'tuscany2025',
    amenities: [
      'Private pool',
      'Full kitchen',
      'Washer & dryer',
      'Air conditioning',
      'Free parking',
      'Baby cot available on request',
      'BBQ grill',
    ],
    notes:
      'Leave shoes at the front door. Pool towels are in the linen closet upstairs.',
    bookingLink: 'https://www.airbnb.com/rooms/placeholder',
    confirmation: 'HMXXXXXX',
    hostName: 'Marco',
    hostPhone: '+39 333 123 4567',
  },

  bookings: [
    {
      id: 'flight-out',
      kind: 'flight',
      title: 'Outbound — JFK → FLR',
      details: 'Delta DL 200 · July 14, 8:30 PM → July 15, 10:45 AM',
      link: 'https://www.delta.com/mytrips',
      confirmation: 'ABCDEF',
      when: '2025-07-14',
    },
    {
      id: 'flight-return',
      kind: 'flight',
      title: 'Return — FLR → JFK',
      details: 'Delta DL 201 · July 22, 12:30 PM → July 22, 5:00 PM',
      link: 'https://www.delta.com/mytrips',
      confirmation: 'ABCDEF',
      when: '2025-07-22',
    },
    {
      id: 'car',
      kind: 'car',
      title: 'Rental Car — Hertz Florence Airport',
      details: 'Mid-size SUV · Pick up July 15, 11:30 AM · Drop off July 22, 11:00 AM',
      link: 'https://www.hertz.com/rentacar/reservation/',
      confirmation: 'H1234567',
      when: '2025-07-15',
    },
    {
      id: 'wedding',
      kind: 'activity',
      title: 'Wedding at Villa Belvedere',
      details: 'July 19 · Ceremony 4:00 PM · Smart casual dress code',
      link: 'https://www.zola.com/wedding/placeholder',
      when: '2025-07-19',
    },
    {
      id: 'vineyard',
      kind: 'activity',
      title: 'Vineyard tour & tasting',
      details: 'Fattoria dei Barbi · Thursday 11:00 AM · Booked for 6',
      link: 'https://www.fattoriadeibarbi.it/',
      when: '2025-07-17',
    },
  ],

  itinerary: [
    {
      date: '2025-07-15',
      title: 'Arrival day',
      items: [
        { time: '10:45 AM', title: 'Land at Florence Airport (FLR)' },
        { time: '11:30 AM', title: 'Pick up rental car', address: 'Hertz · Florence Airport' },
        { time: '3:00 PM', title: 'Check in at Villa del Sole', address: 'Via del Sole 12, Montalcino' },
        { time: '7:00 PM', title: 'Welcome dinner at the villa', notes: 'Keep it light — jet lag is real.' },
      ],
    },
    {
      date: '2025-07-16',
      title: 'Rest day & Montalcino',
      items: [
        { time: '10:00 AM', title: 'Walk into Montalcino town' },
        { time: '1:00 PM', title: 'Lunch at Osteria di Porta al Cassero' },
        { time: '5:00 PM', title: 'Pool time at the villa' },
      ],
    },
    {
      date: '2025-07-17',
      title: 'Vineyard day',
      items: [
        { time: '11:00 AM', title: 'Vineyard tour & tasting at Fattoria dei Barbi', link: 'https://www.fattoriadeibarbi.it/' },
        { time: '2:00 PM', title: 'Lunch on-site' },
        { time: '7:30 PM', title: 'Pizza night at the villa' },
      ],
    },
    {
      date: '2025-07-18',
      title: 'Siena day trip',
      items: [
        { time: '9:30 AM', title: 'Drive to Siena', notes: '~1 hour drive' },
        { time: '11:00 AM', title: 'Piazza del Campo & Duomo' },
        { time: '1:30 PM', title: 'Lunch in Siena' },
        { time: '6:00 PM', title: 'Back to villa, rest for wedding' },
      ],
    },
    {
      date: '2025-07-19',
      title: 'Wedding day',
      items: [
        { time: '3:00 PM', title: 'Leave villa for Villa Belvedere', notes: 'Smart casual — no jeans.' },
        { time: '4:00 PM', title: 'Ceremony at Villa Belvedere' },
        { time: '6:00 PM', title: 'Reception & dinner' },
      ],
    },
    {
      date: '2025-07-20',
      title: 'Recovery & pool',
      items: [
        { time: 'All day', title: 'Pool, long lunch, slow day' },
      ],
    },
    {
      date: '2025-07-21',
      title: 'Val d’Orcia drive',
      items: [
        { time: '10:00 AM', title: 'Scenic drive through Val d’Orcia' },
        { time: '1:00 PM', title: 'Lunch in Pienza' },
        { time: '7:00 PM', title: 'Farewell dinner at the villa' },
      ],
    },
    {
      date: '2025-07-22',
      title: 'Departure',
      items: [
        { time: '8:00 AM', title: 'Pack up and clean' },
        { time: '11:00 AM', title: 'Check out' },
        { time: '12:30 PM', title: 'Flight home — FLR → JFK' },
      ],
    },
  ],

  thingsToDo: [
    {
      id: 'td-1',
      name: 'Piazza del Campo',
      category: 'Sightseeing',
      address: 'Il Campo, Siena',
      url: 'https://maps.google.com/?q=Piazza+del+Campo+Siena',
      notes: 'The shell-shaped main square of Siena.',
    },
    {
      id: 'td-2',
      name: 'Osteria di Porta al Cassero',
      category: 'Restaurant',
      address: 'Via Ricasoli 32, Montalcino',
      url: 'https://maps.google.com/?q=Osteria+di+Porta+al+Cassero',
      notes: 'Classic Tuscan lunch. Reservations recommended.',
    },
    {
      id: 'td-3',
      name: 'Fattoria dei Barbi',
      category: 'Winery',
      address: 'Località Podernovi, Montalcino',
      url: 'https://www.fattoriadeibarbi.it/',
      notes: 'Brunello tasting. We are booked here Thursday 11am.',
    },
    {
      id: 'td-4',
      name: 'Pienza',
      category: 'Town',
      address: 'Pienza, SI',
      url: 'https://maps.google.com/?q=Pienza',
      notes: 'Known for Pecorino cheese and postcard views.',
    },
    {
      id: 'td-5',
      name: 'Terme di San Filippo',
      category: 'Nature',
      address: 'Bagni San Filippo, SI',
      url: 'https://maps.google.com/?q=Terme+di+San+Filippo',
      notes: 'Natural hot springs, free entry. Bring water shoes.',
    },
  ],

  people: [
    { id: 'p1', name: 'Mom', role: 'Family', phone: '+1 555 0100' },
    { id: 'p2', name: 'Dad', role: 'Family', phone: '+1 555 0101' },
    { id: 'p3', name: 'Sister', role: 'Family', phone: '+1 555 0102' },
    { id: 'p4', name: 'Brother-in-law', role: 'Family', phone: '+1 555 0103' },
    { id: 'p5', name: 'You', role: 'Organizer', phone: '+1 555 0104' },
  ],

  contacts: [
    { id: 'c1', label: 'Host (Marco)', value: '+39 333 123 4567', kind: 'phone' },
    { id: 'c2', label: 'Emergency (Italy)', value: '112', kind: 'phone' },
    { id: 'c3', label: 'Nearest hospital — Ospedale di Siena', value: '+39 0577 585 111', kind: 'phone' },
    { id: 'c4', label: 'Local taxi', value: '+39 0577 123 456', kind: 'phone' },
  ],

  checklist: [
    { id: 'ck-f1', title: 'Book flights for everyone', category: 'Flights', done: true },
    { id: 'ck-f2', title: 'Online check-in (24h before)', category: 'Flights', done: false },
    { id: 'ck-a1', title: 'Confirm Airbnb booking', category: 'Stay', done: true },
    { id: 'ck-a2', title: 'Share check-in instructions', category: 'Stay', done: false },
    { id: 'ck-t1', title: 'Book rental car', category: 'Transport', done: true },
    { id: 'ck-w1', title: 'RSVP to wedding', category: 'Wedding', done: true },
    { id: 'ck-w2', title: 'Confirm dress code with family', category: 'Wedding', done: false },
    { id: 'ck-ad1', title: 'Check passport expiry dates', category: 'Admin', done: false },
    { id: 'ck-ad2', title: 'Travel insurance', category: 'Admin', done: false },
    { id: 'ck-ad3', title: 'Notify bank of travel', category: 'Admin', done: false },
  ],

  budget: [
    { id: 'b1', name: 'Villa (7 nights)', total: 2800, splitCount: 5 },
    { id: 'b2', name: 'Rental car', total: 420, splitCount: 5 },
    { id: 'b3', name: 'Groceries budget', total: 300, splitCount: 5 },
    { id: 'b4', name: 'Wedding gift (shared)', total: 200, splitCount: 5 },
  ],

  map: {
    embedUrl: 'https://www.google.com/maps/d/embed?mid=PLACEHOLDER',
  },
}
