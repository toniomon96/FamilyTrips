import type { Trip } from '../../types/trip'
import heroImage from '../../assets/hero.png'

export const stpete: Trip = {
  slug: 'stpete',
  name: 'St. Pete Family Trip',
  location: 'Indian Rocks Beach, FL',
  startDate: '2026-09-03',
  endDate: '2026-09-08',
  heroImage,
  currency: '$',
  tagline: 'Tyler & Yui’s wedding weekend',

  stay: {
    name: 'Exclusive Isla Bonita',
    address: '2718 Gulf Blvd, Indian Rocks Beach, FL',
    checkIn: 'September 3, 2026 · 4:00 PM',
    checkOut: 'September 8, 2026 · 10:00 AM',
    wifiSsid: 'TBD',
    wifiPassword: 'TBD',
    amenities: [
      'Max 12 guests',
      '4 bedrooms · 3 bathrooms',
      '2-car parking (max)',
      'Pool (heat not guaranteed)',
      'On Gulf Blvd in Indian Rocks Beach',
    ],
    notes:
      '5 nights · Check-in 4:00 PM Sept 3 · Check-out 10:00 AM Sept 8.\n\n' +
      'Draft bed plan (swap freely):\n' +
      '• Master — Toni + Morgan + Tatum (pack & play)\n' +
      '• Bedroom 2 — Leah + Tony (Montez)\n' +
      '• Bedroom 3 — Laura + Mark (Goodwin)\n' +
      '• Bedroom 4 — Mikayla (if joining)\n\n' +
      '🚗 Parking plan (exactly the 2 cars allowed):\n' +
      '1. Rental — Toni, Morgan, Tatum, Leah, Tony (picked up at TPA)\n' +
      '2. Mark & Laura’s car (driving from Cullman, AL)\n' +
      'If anyone else drives down, carpool or park off-site.\n\n' +
      'House rules (from the rental agreement):\n' +
      '• No parties or events — immediate eviction\n' +
      '• No smoking — $1,000 fee\n' +
      '• No pets — $395 fee\n' +
      '• Quiet hours after 10 PM\n' +
      '• Exterior security cameras in use\n' +
      '• Pool heat not guaranteed in cooler weather\n' +
      '• Starter toiletries only — bring your own supply\n' +
      '• All payments non-refundable\n' +
      '• Excessive cleaning: $150/hour\n\n' +
      'Total $3,547.50 · ~$1,182.33 per couple (3 couples).\n' +
      '$1,110 paid · $2,437.50 remaining (due Aug 4, 2026).',
    bookingLink: 'https://www.beachtimerentals.com/clearwater-vacation-rentals/exclusive-isla-bonita',
    confirmation: 'RES-21753',
    hostName: 'Beach Time Rentals Suncoast',
    hostPhone: '+1 727 565 2958',
  },

  bookings: [
    {
      id: 'stay',
      kind: 'stay',
      title: 'Airbnb — Exclusive Isla Bonita',
      details:
        '2718 Gulf Blvd, Indian Rocks Beach, FL · Sept 3 → 8 (5 nights) · ' +
        'Check-in 4:00 PM · Check-out 10:00 AM · Max 12 guests · 2-car parking · RES-21753',
      link: 'https://www.beachtimerentals.com/clearwater-vacation-rentals/exclusive-isla-bonita',
      confirmation: 'RES-21753',
      when: '2026-09-03',
    },
    {
      id: 'wedding',
      kind: 'activity',
      title: 'Wedding — Tyler & Yui',
      details:
        'Sunday, Sept 6, 2026 · 11:30 AM – 3:00 PM · Ceremony & brunch reception · ' +
        'Red Mesa Events · 128 3rd Street South, St. Petersburg, FL 33701 · ' +
        'Dress code: Cocktail / business casual — brunch vibes',
      link: 'https://www.zola.com/wedding/yuiandtyler',
      when: '2026-09-06',
    },
    {
      id: 'car',
      kind: 'car',
      title: 'Rental car — TPA pickup',
      details:
        'For Toni + Morgan + Tatum + Toni’s parents (Leah & Tony Montez). ' +
        'Booking this Friday. Pickup at Tampa International (TPA). Pickup/dropoff times TBD.',
      when: '2026-09-03',
    },
    {
      id: 'car-inlaws',
      kind: 'car',
      title: 'In-laws driving in',
      details: 'Mark & Laura Goodwin driving from Cullman, AL in their own car. Counts as the 2nd car at the property.',
      when: '2026-09-03',
    },
    {
      id: 'flights-placeholder',
      kind: 'flight',
      title: 'Flights — booking this Friday',
      details:
        'Toni + Morgan + Tatum + Leah + Tony booking together this Friday. ' +
        'Add each leg here (confirmation, times) as they get booked. Mark & Laura driving, not flying.',
      when: '2026-09-03',
    },
  ],

  itinerary: [
    {
      date: '2026-09-03',
      title: 'Arrival day',
      items: [
        { title: 'Mark & Laura drive in from Cullman, AL', notes: '~11 hr drive. Share ETA in the group chat.' },
        { title: 'Toni, Morgan, Tatum, Leah, Tony fly into TPA', notes: 'Pick up the rental at Tampa International. Share flight ETAs so we can coordinate.' },
        { time: '4:00 PM', title: 'Check in at Exclusive Isla Bonita', address: '2718 Gulf Blvd, Indian Rocks Beach, FL', notes: 'Two cars at the property: the rental + Mark & Laura’s car. No room for a third.' },
        { title: 'Welcome dinner at the house', notes: 'Grocery run after check-in. Starter toiletries only — bring your own.' },
      ],
    },
    {
      date: '2026-09-04',
      title: 'Beach & settle-in',
      items: [
        { title: 'Clearwater Beach morning', notes: 'Sunscreen, beach tent, swim diapers for Tatum.' },
        { title: 'Afternoon at the pool' },
        { title: 'Group dinner — TBD' },
      ],
    },
    {
      date: '2026-09-05',
      title: 'Day trip: Orlando — Dad’s side of the family',
      items: [
        { time: '9:30 AM', title: 'Leave Indian Rocks Beach for Orlando', notes: '~2 hr drive via I-4. Everyone going.' },
        { time: '11:30 AM', title: 'Arrive · visit with the Montez family in Orlando', notes: 'Address TBD — confirm with Dad (Tony).' },
        { title: 'Cookout (tentative)', notes: 'Might have one — confirm with Dad.' },
        { time: '5:00 PM', title: 'Head back to Indian Rocks Beach', notes: 'Earlier the better — wedding is tomorrow at 11:30 AM.' },
        { time: '7:30 PM', title: 'Back at the house · low-key dinner' },
      ],
    },
    {
      date: '2026-09-06',
      title: 'Wedding day — Tyler & Yui 💍',
      items: [
        { time: '9:30 AM', title: 'Get ready at the house', notes: 'Dress code: cocktail / business casual — brunch vibes.' },
        {
          time: '10:30 AM',
          title: 'Leave for Red Mesa Events',
          address: '128 3rd Street South, St. Petersburg, FL 33701',
          notes: '~25 min drive from Indian Rocks Beach. Budget extra for parking.',
        },
        { time: '11:30 AM', title: 'Ceremony at Red Mesa Events' },
        { time: '12:00 PM', title: 'Brunch reception' },
        { time: '3:00 PM', title: 'Reception ends · head back to the house' },
        { title: 'Babysitting plan for Tatum', notes: 'Decide ahead: sitter at the house vs rotating with family.' },
      ],
    },
    {
      date: '2026-09-07',
      title: 'Recovery & beach',
      items: [
        { title: 'Slow morning' },
        { title: 'Beach or aquarium', notes: 'Clearwater Marine Aquarium is great with a baby.' },
        { title: 'Farewell dinner at the house' },
      ],
    },
    {
      date: '2026-09-08',
      title: 'Departure',
      items: [
        { time: '8:00 AM', title: 'Pack up and tidy · take out trash' },
        { time: '10:00 AM', title: 'Check out' },
        { title: 'Drop off rental car · head home' },
      ],
    },
  ],

  thingsToDo: [
    { id: 'td-0', name: 'Indian Rocks Beach (our beach)', category: 'Beach', address: 'Indian Rocks Beach, FL', url: 'https://maps.google.com/?q=Indian+Rocks+Beach', notes: 'Right outside the rental — walk across Gulf Blvd.' },
    { id: 'td-1', name: 'Clearwater Beach', category: 'Beach', address: 'Clearwater Beach, FL', url: 'https://maps.google.com/?q=Clearwater+Beach', notes: '~10 min north. Busier, classic white sand.' },
    { id: 'td-2', name: 'Pier 60 Sunset', category: 'Sightseeing', address: 'Pier 60, Clearwater Beach', url: 'https://maps.google.com/?q=Pier+60+Clearwater', notes: 'Sunset festival most evenings — walkable from the beach.' },
    { id: 'td-3', name: 'Clearwater Marine Aquarium', category: 'Family', address: '249 Windward Passage, Clearwater', url: 'https://www.cmaquarium.org/', notes: 'Good rainy-day / baby-friendly option.' },
    { id: 'td-4', name: 'St. Pete Pier', category: 'Sightseeing', address: '600 2nd Ave NE, St. Petersburg', url: 'https://stpetepier.org/', notes: 'Restaurants, splash pad, playground, views.' },
    { id: 'td-5', name: 'The Dalí Museum', category: 'Museum', address: '1 Dali Blvd, St. Petersburg', url: 'https://thedali.org/', notes: 'Short visit; worth a morning.' },
    { id: 'td-6', name: 'Frenchy’s Rockaway Grill', category: 'Restaurant', address: '7 Rockaway St, Clearwater Beach', url: 'https://frenchysonline.com/', notes: 'Beachside seafood. Expect a wait — go early.' },
  ],

  people: [
    { id: 'p-toni', name: 'Toni Montez', role: 'Organizer', phone: '+1 469 371 9091' },
    { id: 'p-morgan', name: 'Morgan Montez', role: 'Wife', phone: '+1 256 727 2388' },
    { id: 'p-tatum', name: 'Tatum Montez', role: 'Daughter (infant)' },
    { id: 'p-leah', name: 'Leah Montez', role: 'Mom', phone: '+1 214 475 1376' },
    { id: 'p-tony', name: 'Tony Montez', role: 'Dad', phone: '+1 469 865 0500' },
    { id: 'p-laura', name: 'Laura Goodwin', role: 'Mother-in-law', phone: '+1 256 595 1636' },
    { id: 'p-mark', name: 'Mark Goodwin', role: 'Father-in-law', phone: '+1 256 595 2643' },
    { id: 'p-mikayla', name: 'Mikayla Goodwin', role: 'Sister-in-law · Tentative', phone: '+1 256 735 9353' },
  ],

  contacts: [
    { id: 'c-emerg', label: 'Emergency (US)', value: '911', kind: 'phone' },
    { id: 'c-couple', label: 'Tyler & Yui — wedding site', value: 'https://www.zola.com/wedding/yuiandtyler', kind: 'url', notes: 'Password: momo' },
    { id: 'c-rental-text', label: 'Beach Time Rentals — text line', value: '+1 727 565 2958', kind: 'phone', notes: 'Reservation RES-21753. Preferred for quick questions.' },
    { id: 'c-rental-office', label: 'Beach Time Rentals — office', value: '+1 800 691 8183', kind: 'phone' },
    { id: 'c-rental-email', label: 'Beach Time Rentals — email', value: 'customerservice@beachtimerentals.com', kind: 'text' },
    { id: 'c-airport', label: 'Tampa International Airport', value: '+1 813 870 8700', kind: 'phone' },
  ],

  checklist: [
    // Flights
    { id: 'ck-fl-1', title: 'Set Google Flights price alerts', category: 'Flights', done: false },
    { id: 'ck-fl-2', title: 'Compare flights across family', category: 'Flights', done: false },
    { id: 'ck-fl-3', title: 'Select seats (sit together + near grandparents)', category: 'Flights', done: false },
    { id: 'ck-fl-4', title: 'Book flights', category: 'Flights', done: false, notes: 'Booking this Friday: Toni, Morgan, Tatum, Leah, Tony. Mark & Laura driving.' },
    { id: 'ck-fl-5', title: 'Confirm all flight times', category: 'Flights', done: false },
    { id: 'ck-fl-6', title: 'Add Tatum as infant on ticket', category: 'Flights', done: false },
    { id: 'ck-fl-7', title: 'Download airline apps + boarding passes', category: 'Flights', done: false },
    { id: 'ck-fl-8', title: 'Check baggage allowances', category: 'Flights', done: false },

    // Stay
    { id: 'ck-st-1', title: 'Confirm Airbnb booking', category: 'Stay', done: true },
    { id: 'ck-st-2', title: 'Make final $2,437.50 payment (due Aug 4)', category: 'Stay', done: false },
    { id: 'ck-st-3', title: 'Get entry codes from Beach Time Rentals', category: 'Stay', done: false, notes: 'Check-in confirmed for 4:00 PM Sept 3 · codes usually emailed a few days prior.' },
    { id: 'ck-st-4', title: 'Share bed plan with the group', category: 'Stay', done: false },
    { id: 'ck-st-5', title: 'Confirm pack & play / crib', category: 'Stay', done: false },
    { id: 'ck-st-6', title: 'Share address + Wi-Fi with everyone', category: 'Stay', done: false, notes: 'Address: 2718 Gulf Blvd, Indian Rocks Beach · Wi-Fi arrives with check-in info.' },
    { id: 'ck-st-7', title: 'Pack own toiletries (property only provides starter)', category: 'Stay', done: false },

    // Transport
    { id: 'ck-tr-1', title: 'Decide rental car count', category: 'Transport', done: true, notes: 'One rental at TPA for Toni/Morgan/Tatum + Leah/Tony. Mark & Laura driving their own.' },
    { id: 'ck-tr-2', title: 'Book rental car', category: 'Transport', done: false, notes: 'Booking this Friday. Needs infant car seat.' },
    { id: 'ck-tr-3', title: 'Confirm infant car seat (in the rental)', category: 'Transport', done: false },
    { id: 'ck-tr-4', title: 'Coordinate airport pickups', category: 'Transport', done: false, notes: 'Rental handles Toni/Morgan/Tatum/Leah/Tony. Mark & Laura arriving separately by car.' },
    { id: 'ck-tr-5', title: 'Share arrival/departure times in group chat', category: 'Transport', done: false },
    { id: 'ck-tr-6', title: 'Plan for 2-car parking max at property', category: 'Transport', done: true, notes: 'Locked: rental + Mark & Laura\'s car = the 2 allowed.' },

    // Food
    { id: 'ck-fo-1', title: 'Start shared grocery list', category: 'Food', done: false },
    { id: 'ck-fo-2', title: 'Pick restaurants for group nights', category: 'Food', done: false },
    { id: 'ck-fo-3', title: 'Make reservations where needed', category: 'Food', done: false },

    // Baby (Tatum)
    { id: 'ck-ba-1', title: 'Pack & play plan', category: 'Baby', done: false },
    { id: 'ck-ba-2', title: 'High chair at the house?', category: 'Baby', done: false },
    { id: 'ck-ba-3', title: 'Stroller — travel or full?', category: 'Baby', done: false },
    { id: 'ck-ba-4', title: 'Beach shade / tent', category: 'Baby', done: false },
    { id: 'ck-ba-5', title: 'Sunscreen, hats, swim diapers', category: 'Baby', done: false },

    // Dogs
    { id: 'ck-do-1', title: 'Find dog sitter', category: 'Dogs', done: false },
    { id: 'ck-do-2', title: 'Pack food + leashes', category: 'Dogs', done: false },
    { id: 'ck-do-3', title: 'Drop off dogs before flight', category: 'Dogs', done: false },
    { id: 'ck-do-4', title: 'Pick up dogs on return', category: 'Dogs', done: false },

    // Wedding
    { id: 'ck-we-1', title: 'RSVP on Zola', category: 'Wedding', done: false, notes: 'zola.com/wedding/yuiandtyler · password: momo' },
    { id: 'ck-we-2', title: 'Confirm ceremony & reception time + venue', category: 'Wedding', done: true, notes: 'Sun Sept 6 · 11:30 AM – 3:00 PM · Red Mesa Events · 128 3rd St S, St. Petersburg FL 33701' },
    { id: 'ck-we-3', title: 'Confirm dress code', category: 'Wedding', done: true, notes: 'Cocktail / business casual — brunch vibes.' },
    { id: 'ck-we-4', title: 'Babysitting plan for Tatum', category: 'Wedding', done: false },
    { id: 'ck-we-5', title: 'Transportation to/from venue', category: 'Wedding', done: false },
    { id: 'ck-we-6', title: 'Buy wedding gift', category: 'Wedding', done: false },

    // Admin
    { id: 'ck-ad-1', title: 'Save Beach Time Rentals contact', category: 'Admin', done: true, notes: 'RES-21753 · text 727 565 2958 · office 800 691 8183' },
    { id: 'ck-ad-2', title: 'Share emergency contact list', category: 'Admin', done: false, notes: 'Tap "Copy everyone" on the People page to paste into the group chat.' },
    { id: 'ck-ad-3', title: 'Sign Short Term Rental Agreement', category: 'Admin', done: false, notes: 'Adobe Acrobat Sign link emailed by Beach Time Rentals.' },
    { id: 'ck-ad-4', title: 'Confirm Sat Orlando visit plans with Dad', category: 'Admin', done: false, notes: 'Address, arrival time, cookout vs not. ~2 hr each way.' },
  ],

  budget: [
    {
      id: 'b-stay',
      name: 'Airbnb (Exclusive Isla Bonita)',
      total: 3547.5,
      splitCount: 6,
      notes:
        '5 nights · Base $2,625 · Fees $514.38 (incl. $110 property protection) · Tax $408.12. ' +
        '$1,110 paid, $2,437.50 due Aug 4. Split 3 couples = $1,182.33/couple. All payments non-refundable.',
    },
    { id: 'b-car', name: 'Rental car (estimate)', total: 400, splitCount: 6, notes: 'Placeholder — update once booked.' },
    { id: 'b-groceries', name: 'Groceries (estimate)', total: 300, splitCount: 6, notes: 'Placeholder — tune as we plan meals.' },
    { id: 'b-gift', name: 'Wedding gift (shared)', total: 200, splitCount: 6, notes: 'Placeholder — set once the group decides.' },
  ],
}
