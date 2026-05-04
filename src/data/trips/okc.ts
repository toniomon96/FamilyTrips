import type { Trip } from '../../types/trip'
import { dogChecklistItems } from '../checklistPresets.js'

export const okc: Trip = {
  slug: 'okc',
  name: 'Morgan’s 25th — WCWS Weekend',
  location: 'Oklahoma City, OK',
  startDate: '2026-05-28',
  endDate: '2026-05-31',
  currency: '$',
  tagline: 'Morgan’s 25th birthday + Women’s College World Series',

  stay: {
    name: 'Home in Oklahoma City · Modern 3BR with hot tub',
    address: '1127 Northwest 56th Street, Oklahoma City, OK 73118',
    checkIn: 'Thursday, May 28, 2026 · 4:00 PM',
    checkOut: 'Sunday, May 31, 2026 · 11:00 AM',
    amenities: [
      '3 bedrooms',
      'Hot tub',
      'Pets allowed',
      '6 guests max',
      'Near Classen Curve & Plaza',
    ],
    notes:
      '3 nights · Thursday May 28 → Sunday May 31. ' +
      'Airbnb reservation was originally Fri–Sun; host extended the stay to start Thursday so we have an extra day.\n\n' +
      '🅿️ Parking: in front of the house on the gravel, perpendicular to the gray stucco wall.\n' +
      '🔑 Key: in an outlet box to the left of the front door, behind the vase planter.\n\n' +
      'House rules (from Airbnb):\n' +
      '• 6 guests maximum (we are 6 adults + Tatum as infant — within limits)\n' +
      '• No parties or events\n' +
      '• No smoking\n' +
      '• Pets allowed\n\n' +
      'Cancellation policy:\n' +
      '• Free cancellation before 4:00 PM on May 15\n' +
      '• Partial refund if cancelled before 4:00 PM on May 22\n\n' +
      'Airbnb Fri–Sun paid in full: $1,075.74. Thursday-night extension handled with the host — confirm amount.',
    confirmation: 'HMMQ5TZATP',
    hostName: 'Nitin (OKC Airbnb Host)',
    hostPhone: '+1 405 795 2119',
  },

  bookings: [
    {
      id: 'stay',
      kind: 'stay',
      title: 'Airbnb — Home in Oklahoma City (3BR + hot tub)',
      details:
        '1127 Northwest 56th Street, Oklahoma City, OK 73118 · Thu May 28 → Sun May 31 (3 nights, host-extended). ' +
        'Check-in 4:00 PM Thu · Check-out 11:00 AM Sun · 6 guest max · Pets allowed. ' +
        'Fri–Sun paid $1,075.74 on Airbnb · Thursday extension via host (amount TBD).',
      confirmation: 'HMMQ5TZATP',
      when: '2026-05-28',
    },
    {
      id: 'drive',
      kind: 'car',
      title: 'Drive from Dallas → OKC',
      details:
        'Toni, Morgan, Tatum driving up from Dallas on Thursday. ~3 hr 15 min each way. ' +
        'Tony & Leah travel plan TBD. Mark & Laura travel plan TBD.',
      when: '2026-05-28',
    },
    {
      id: 'bday',
      kind: 'activity',
      title: 'Morgan’s 25th birthday dinner — The Jones Assembly',
      details:
        'Friday night · main birthday celebration · The Jones Assembly in Bricktown-adjacent OKC. ' +
        '901 N Broadway Ave, Oklahoma City, OK 73102. Reservation needed for 6 adults + infant. ' +
        'Keep it relaxed — optional walk through Bricktown after. Keep quiet in front of Morgan.',
      when: '2026-05-29',
    },
    {
      id: 'wcws',
      kind: 'activity',
      title: 'WCWS Session 4 — Sat · Games 7 & 8',
      details:
        '2026 NCAA Women’s College World Series at Devon Park · 2801 NE 50th St, Oklahoma City, OK 73111. ' +
        'Saturday, May 30 · Session 4 = 2:00 PM + 6:00 PM CDT · doors 12:30 PM. ' +
        '6 admissions · Section 19, Row H, Seats 34–39 (consecutive). ' +
        'Plan: leave the house ~1:00–1:15 PM, in seats by 1:30 PM. ' +
        'Between games: stay at the stadium or return to the Airbnb depending on energy / Tatum. ' +
        'All times CDT. Dates/sessions subject to change per NCAA.',
      when: '2026-05-30',
    },
  ],

  itinerary: [
    {
      date: '2026-05-28',
      title: 'Arrival · settle in',
      items: [
        { title: 'Drive Dallas → OKC', notes: '~3 hr 15 min via I-35 N. Stop for lunch on the way.' },
        {
          time: '4:00 PM',
          title: 'Check in at the Airbnb',
          address: '1127 Northwest 56th Street, Oklahoma City, OK 73118',
          notes: 'Key in outlet box to the left of the front door (behind vase planter). Park on gravel, perpendicular to the gray stucco wall.',
        },
        { title: 'Unpack · grocery / Whole Foods run', notes: 'Trader Joe’s + Whole Foods are near the house (Classen Curve).' },
        { title: 'Easy dinner in / light evening', notes: 'Keep it chill — tomorrow is the celebration. Hot tub optional.' },
      ],
    },
    {
      date: '2026-05-29',
      title: 'Morgan’s birthday 🎂 · Bricktown night',
      items: [
        { title: 'Slow morning at the house' },
        { title: 'Optional: Classen Curve / Plaza District wander', notes: 'Walkable from the Airbnb. Easy with the stroller.' },
        { title: 'Afternoon: rest / hot tub / get ready' },
        {
          title: 'Head to Bricktown',
          address: 'Bricktown, Oklahoma City, OK',
          notes: 'Park once, walk the canal.',
        },
        {
          title: 'Birthday dinner — The Jones Assembly',
          address: '901 N Broadway Ave, Oklahoma City, OK 73102',
          notes: 'Main birthday celebration. Reservation for 6 + infant. Surprise element coordinated with the family — keep quiet in front of Morgan.',
        },
        { title: 'Optional walk through Bricktown after dinner' },
      ],
    },
    {
      date: '2026-05-30',
      title: 'Game day · WCWS Session 4',
      items: [
        { title: 'Slow morning at the house', notes: 'Cook breakfast or order delivery. Take it easy.' },
        { time: '1:00 PM', title: 'Leave for Devon Park', notes: 'Leave ~1:00–1:15 PM to arrive by 1:30.' },
        {
          time: '2:00 PM',
          title: 'WCWS Game 7',
          address: '2801 NE 50th St, Oklahoma City, OK 73111',
          notes: 'Section 19, Row H, Seats 34–39. Hats, sunscreen, water, baby ear protection for Tatum.',
        },
        {
          title: 'Between games',
          notes: 'Stay at the stadium OR head back to the Airbnb to regroup — decide live depending on energy / Tatum.',
        },
        {
          time: '6:00 PM',
          title: 'WCWS Game 8',
          address: '2801 NE 50th St, Oklahoma City, OK 73111',
          notes: 'Same seats. Same ticket (Session 4 covers both games).',
        },
        { title: 'After games', notes: 'No formal dinner plans. Grab something quick or head back and relax.' },
      ],
    },
    {
      date: '2026-05-31',
      title: 'Slow morning · drive home',
      items: [
        { title: 'Slow morning · easy breakfast' },
        { time: '10:30 AM', title: 'Pack up · tidy the house' },
        { time: '11:00 AM', title: 'Check out' },
        { title: 'Drive back to Dallas', notes: '~3 hr 15 min. Share ETA in the group chat.' },
      ],
    },
  ],

  thingsToDo: [
    { id: 'td-wcws', name: 'Devon Park (USA Softball Hall of Fame Stadium)', category: 'Sports', address: '2801 NE 50th St, Oklahoma City, OK 73111', url: 'https://maps.google.com/?q=2801+NE+50th+St+Oklahoma+City', notes: 'Host of the Women’s College World Series. Our seats: Sec 19, Row H, Seats 34–39.' },
    { id: 'td-jones', name: 'The Jones Assembly', category: 'Restaurant', address: '901 N Broadway Ave, Oklahoma City, OK 73102', url: 'https://maps.google.com/?q=The+Jones+Assembly+Oklahoma+City', notes: 'Morgan’s birthday dinner on Friday.' },
    { id: 'td-bricktown', name: 'Bricktown', category: 'District', address: 'Bricktown, Oklahoma City, OK', url: 'https://maps.google.com/?q=Bricktown+Oklahoma+City', notes: 'Canal, restaurants, walkable. Good with the stroller. Perfect for the Friday night post-dinner walk.' },
    { id: 'td-classen', name: 'Classen Curve & The Plaza District', category: 'Neighborhood', address: 'Classen Curve, Oklahoma City, OK', url: 'https://maps.google.com/?q=Classen+Curve+Oklahoma+City', notes: 'Walkable from the Airbnb — restaurants, shops, Whole Foods, Trader Joe’s.' },
    { id: 'td-pearls', name: 'Pearl’s Oyster Bar', category: 'Restaurant', address: 'Oklahoma City, OK', url: 'https://maps.google.com/?q=Pearls+Oyster+Bar+Oklahoma+City', notes: 'Right around the corner from the Airbnb. Easy Thursday or between-games option.' },
    { id: 'td-cowboy', name: 'National Cowboy & Western Heritage Museum', category: 'Museum', address: '1700 NE 63rd St, Oklahoma City, OK', url: 'https://nationalcowboymuseum.org/', notes: 'Close to Devon Park — easy to pair with a game.' },
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
    { id: 'c-host', label: 'Airbnb host — Nitin', value: '+1 405 795 2119', kind: 'phone', notes: 'Reservation HMMQ5TZATP.' },
    { id: 'c-devon', label: 'Devon Park (USA Softball Hall of Fame Stadium)', value: 'https://maps.google.com/?q=2801+NE+50th+St+Oklahoma+City', kind: 'url', notes: '2801 NE 50th St, Oklahoma City, OK 73111.' },
    { id: 'c-jones', label: 'The Jones Assembly', value: 'https://maps.google.com/?q=The+Jones+Assembly+Oklahoma+City', kind: 'url', notes: '901 N Broadway Ave, Oklahoma City, OK 73102.' },
  ],

  checklist: [
    // Stay
    { id: 'ck-st-1', title: 'Book Airbnb', category: 'Stay', done: true, notes: '3BR + hot tub · 1127 NW 56th St · HMMQ5TZATP · paid $1,075.74 for Fri–Sun.' },
    { id: 'ck-st-2', title: 'Confirm Thursday-night extension with Nitin', category: 'Stay', done: true, notes: 'Host extended to start Thursday. Confirm final amount + any change to check-in process.' },
    { id: 'ck-st-3', title: 'Share address + key + parking instructions with the group', category: 'Stay', done: false, notes: 'Parking: gravel in front, perpendicular to gray stucco wall. Key: outlet box left of front door (behind vase planter).' },
    { id: 'ck-st-4', title: 'Save Nitin (host) as a contact', category: 'Stay', done: true },
    { id: 'ck-st-5', title: 'Reminder: last free-cancel 4 PM May 15 (partial until 4 PM May 22)', category: 'Stay', done: false },
    { id: 'ck-st-6', title: 'Pack & play / crib for Tatum at the Airbnb', category: 'Stay', done: false },
    { id: 'ck-st-7', title: 'Plan bed assignments (3BR for 6 adults)', category: 'Stay', done: false },

    // Transport (driving trip)
    { id: 'ck-tr-1', title: 'Install infant car seat', category: 'Transport', done: false },
    { id: 'ck-tr-2', title: 'Oil change / tire check before the drive', category: 'Transport', done: false },
    { id: 'ck-tr-3', title: 'Gas up the night before', category: 'Transport', done: false },
    { id: 'ck-tr-4', title: 'Road snacks + drinks', category: 'Transport', done: false },
    { id: 'ck-tr-5', title: 'Stroller in the trunk', category: 'Transport', done: false },
    { id: 'ck-tr-6', title: 'Confirm parents’ travel plans (Tony/Leah, Mark/Laura)', category: 'Transport', done: false, notes: 'Who’s driving from where, Thursday vs Friday arrival, any carpool.' },

    // Tickets
    { id: 'ck-ti-1', title: 'Pick which WCWS session(s) to attend', category: 'Tickets', done: true, notes: 'Session 4 · Sat May 30 · 2:00 PM + 6:00 PM CDT · Games 7 & 8.' },
    { id: 'ck-ti-2', title: 'Buy WCWS tickets', category: 'Tickets', done: true, notes: '6 admissions · Sec 19, Row H, Seats 34–39 (consecutive).' },
    { id: 'ck-ti-3', title: 'Save tickets to phones', category: 'Tickets', done: false, notes: 'Transfer from the ticket app to each person so they can enter separately if needed.' },
    { id: 'ck-ti-4', title: 'Plan arrival at Devon Park', category: 'Tickets', done: true, notes: 'Doors 12:30 PM · leave house ~1:00–1:15 PM · in seats by 1:30 PM.' },

    // Birthday (surprise for Morgan)
    { id: 'ck-bd-1', title: 'Book The Jones Assembly — Friday 6 + infant', category: 'Birthday', done: false, notes: 'Friday = main celebration. Earlier reservation is better with Tatum.' },
    { id: 'ck-bd-2', title: 'Cake or dessert plan', category: 'Birthday', done: false, notes: 'Bring in at the restaurant or do back at the Airbnb after.' },
    { id: 'ck-bd-3', title: 'Gift(s)', category: 'Birthday', done: false },
    { id: 'ck-bd-4', title: 'Photo / group toast plan', category: 'Birthday', done: false },
    { id: 'ck-bd-5', title: 'Align the family so nobody spoils the surprise', category: 'Birthday', done: false },

    // Baby (Tatum)
    { id: 'ck-ba-1', title: 'Pack & play', category: 'Baby', done: false },
    { id: 'ck-ba-2', title: 'Bottles + formula/feeding supplies', category: 'Baby', done: false },
    { id: 'ck-ba-3', title: 'Diapers + wipes (more than you think)', category: 'Baby', done: false },
    { id: 'ck-ba-4', title: 'Sun hat + baby sunscreen (day game at Devon Park)', category: 'Baby', done: false },
    { id: 'ck-ba-5', title: 'Baby ear protection for the stadium', category: 'Baby', done: false },
    { id: 'ck-ba-6', title: 'Stroller for Bricktown / park walks', category: 'Baby', done: false },
    { id: 'ck-ba-7', title: 'Plan for Tatum during the 6 PM game', category: 'Baby', done: false, notes: 'Two games back-to-back is a lot — decide ahead if she stays for both, or someone heads back with her.' },

    // Dogs
    ...dogChecklistItems(),

    // Admin
    { id: 'ck-ad-1', title: 'Share address + ETAs in the group chat', category: 'Admin', done: false },
    { id: 'ck-ad-2', title: 'Share emergency contact list', category: 'Admin', done: false, notes: 'Tap "Copy everyone" on the People page.' },
    { id: 'ck-ad-3', title: 'Share the Saturday game-day plan', category: 'Admin', done: false, notes: 'Leave 1:00–1:15 PM · doors 12:30 · seats Sec 19 Row H 34–39.' },
  ],

  packing: [
    { id: 'pk-docs-id', title: 'Photo IDs', category: 'Travel docs', quantity: 'Adults' },
    { id: 'pk-docs-airbnb', title: 'Airbnb confirmation and key instructions', category: 'Travel docs' },
    { id: 'pk-docs-tickets', title: 'WCWS tickets saved to phones', category: 'Travel docs' },
    { id: 'pk-clothes-weekend', title: 'Weekend outfits', category: 'Clothes', quantity: '3 days' },
    { id: 'pk-clothes-game', title: 'Game-day clothes', category: 'Clothes', notes: 'Comfortable for Devon Park.' },
    { id: 'pk-clothes-sleep', title: 'Sleepwear', category: 'Clothes' },
    { id: 'pk-toiletries-basics', title: 'Toiletries', category: 'Toiletries' },
    { id: 'pk-toiletries-meds', title: 'Medicine / prescriptions', category: 'Toiletries' },
    { id: 'pk-birthday-outfit', title: 'Birthday dinner outfit', category: 'Wedding / Event', notes: 'The Jones Assembly Friday night.' },
    { id: 'pk-birthday-gift', title: 'Morgan birthday gift / card', category: 'Wedding / Event' },
    { id: 'pk-baby-diapers', title: 'Diapers + wipes', category: 'Baby', assignedTo: 'Tatum' },
    { id: 'pk-baby-feeding', title: 'Bottles + feeding supplies', category: 'Baby', assignedTo: 'Tatum' },
    { id: 'pk-baby-stroller', title: 'Stroller', category: 'Baby', assignedTo: 'Tatum' },
    { id: 'pk-baby-ear', title: 'Baby ear protection', category: 'Baby', assignedTo: 'Tatum', notes: 'For the stadium.' },
    { id: 'pk-tech-chargers', title: 'Phone chargers', category: 'Tech' },
    { id: 'pk-tech-battery', title: 'Portable battery', category: 'Tech', notes: 'Useful for doubleheader day.' },
    { id: 'pk-car-seat', title: 'Infant car seat installed', category: 'Car / Road trip' },
    { id: 'pk-car-snacks', title: 'Road snacks + drinks', category: 'Car / Road trip' },
    { id: 'pk-car-entertainment', title: 'Baby toys / car entertainment', category: 'Car / Road trip' },
    { id: 'pk-dogs-food', title: 'Dog food + bowls', category: 'Dogs' },
    { id: 'pk-dogs-leash', title: 'Leashes / waste bags', category: 'Dogs' },
  ],

  budget: [
    {
      id: 'b-stay',
      name: 'Airbnb — Fri–Sun (paid)',
      total: 1075.74,
      splitCount: 6,
      notes: '3BR + hot tub · 2 Airbnb nights · HMMQ5TZATP · already paid. Split 6 adults ≈ $179/person.',
    },
    { id: 'b-stay-ext', name: 'Airbnb — Thursday extension (host)', total: 0, splitCount: 6, status: 'tbd', notes: 'Extra night added by the host. Update total once confirmed with Nitin.' },
    { id: 'b-tix', name: 'WCWS tickets — Session 4 (purchased)', total: 0, splitCount: 6, status: 'tbd', notes: '6 admissions · Sec 19, Row H, Seats 34–39. Update with actual paid amount.' },
    { id: 'b-dinner', name: 'Birthday dinner — The Jones Assembly', total: 400, splitCount: 6, notes: 'Estimate for Friday — update once reservation + actual bill are set.' },
    { id: 'b-gas', name: 'Gas round-trip (Dallas ⇄ OKC)', total: 120, splitCount: 6 },
    { id: 'b-food', name: 'Groceries + other food', total: 300, splitCount: 6, notes: 'Whole Foods / Trader Joe’s run Thursday + breakfasts + between-game food.' },
  ],
}
