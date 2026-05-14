import type { Trip } from '../../types/trip'
import { dogChecklistItems } from '../checklistPresets.js'

const heroImage = new URL('../../assets/hero.png', import.meta.url).href

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
    address: 'Shared privately with the group',
    checkIn: 'September 3, 2026 · 4:00 PM',
    checkOut: 'September 8, 2026 · 10:00 AM',
    wifiSsid: 'TBD',
    wifiPassword: 'TBD',
    amenities: [
      'Max 12 guests',
      '4 bedrooms · 3.5 bathrooms',
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
      '• Bedroom 4 — Mikayla + Courtney (tentative)\n\n' +
      '🚗 Parking plan (exactly the 2 cars allowed):\n' +
      '1. Rental — Toni, Morgan, Tatum, Leah, Tony (picked up at TPA; large SUV may not fully fit inside the garage, but can still park there)\n' +
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
      'Total $3,547.50 · $1,182.50 per share if split 3 ways. If Mikayla + Courtney come, split 4 ways = $886.88/share.\n' +
      '$1,110 paid · $2,437.50 remaining (due Aug 4, 2026).',
    bookingLink: 'https://www.beachtimerentals.com/clearwater-vacation-rentals/exclusive-isla-bonita',
    hostName: 'Beach Time Rentals Suncoast',
  },

  bookings: [
    {
      id: 'stay',
      kind: 'stay',
      title: 'Beach Time rental — Exclusive Isla Bonita',
      details:
        'Address shared privately with the group · Sept 3 → 8 (5 nights) · ' +
        'Check-in 4:00 PM · Check-out 10:00 AM · 4BR / 3.5BA · Max 12 guests · 2-car parking.',
      link: 'https://www.beachtimerentals.com/clearwater-vacation-rentals/exclusive-isla-bonita',
      when: '2026-09-03',
    },
    {
      id: 'wedding',
      kind: 'activity',
      title: 'Wedding — Tyler & Yui',
      details:
        'Sunday, Sept 6, 2026 · 11:30 AM – 3:00 PM · Ceremony & brunch reception · ' +
        'Red Mesa Events · 128 3rd Street South, St. Petersburg, FL 33701 · ' +
        'Dress code: Cocktail / business casual — brunch vibes · ' +
        'Attending: Toni, Morgan, Leah, Tony. Mark, Laura, and Mikayla/Courtney if present watch Tatum at the house.',
      link: 'https://www.zola.com/wedding/yuiandtyler',
      when: '2026-09-06',
    },
    {
      id: 'car',
      kind: 'car',
      title: 'Rental car — Enterprise at TPA',
      details:
        'Enterprise via Costco Travel · Reserved now, pay later at the agency. ' +
        'Ford Expedition Max, Jeep Wagoneer L, or similar large SUV · 8 passengers / 7 bags. ' +
        'Pickup: Sept 3, 2026 10:00 AM at Tampa International Airport, 5405 Airport Service Rd, Tampa, FL 33607. ' +
        'Drop-off: Sept 8, 2026 1:00 PM at TPA. Total $376.93; $0.00 paid; balance due at agency. ' +
        'Confirmation details stored privately. ' +
        'Unlimited mileage · Additional driver included · No cancellation fees.',
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
      title: 'Outbound flight — AA 2516 to Tampa',
      details:
        'Toni, Morgan, Tatum, Leah, and Tony fly together to Tampa on American Airlines flight 2516 at 7:05 AM. Mark & Laura driving, not flying.',
      when: '2026-09-03',
    },
    {
      id: 'return-toni-morgan',
      kind: 'flight',
      title: 'Return flight — Toni + Morgan + Tatum AA 1957 to Dallas',
      details:
        'Toni, Morgan, and Tatum return to Dallas on American Airlines flight 1957 at 3:52 PM on Sept 8. Return flights are separate from Leah/Tony.',
      when: '2026-09-08',
    },
    {
      id: 'return-parents',
      kind: 'flight',
      title: 'Return flight — Leah + Tony',
      details:
        'Leah and Tony return separately on Sept 8. Their airline, flight number, and time are not being tracked here.',
      when: '2026-09-08',
    },
  ],

  itinerary: [
    {
      date: '2026-09-03',
      title: 'Arrival day',
      items: [
        { title: 'Mark & Laura drive in from Cullman, AL', notes: '~11 hr drive. Share ETA in the group chat.' },
        { time: '7:05 AM', title: 'Toni, Morgan, Tatum, Leah, Tony fly into TPA on AA 2516', notes: 'American Airlines flight 2516 to Tampa. Enterprise rental is reserved for 10:00 AM at Tampa International.' },
        { time: '4:00 PM', title: 'Check in at Exclusive Isla Bonita', address: 'Address shared privately with the group', notes: 'Two cars at the property: the rental + Mark & Laura’s car. No room for a third.' },
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
          notes: 'Wedding crew: Toni, Morgan, Leah, and Tony. Mark, Laura, and Mikayla/Courtney if present stay at the house with Tatum.',
        },
        { time: '11:30 AM', title: 'Ceremony at Red Mesa Events' },
        { time: '12:00 PM', title: 'Brunch reception' },
        { time: '3:00 PM', title: 'Reception ends · head back to the house' },
        { title: 'Tatum care plan', notes: 'Mark, Laura, and Mikayla/Courtney if present watch Tatum at the house during the wedding.' },
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
        { time: '1:00 PM', title: 'Drop off rental car at TPA', notes: 'Rental confirmation is stored privately; $376.93 due at the agency unless prepaid/changed later.' },
        { time: '3:52 PM', title: 'Toni, Morgan, and Tatum fly to Dallas on AA 1957', notes: 'Leah and Tony return separately the same day; details are not tracked here.' },
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
    { id: 'p-toni', name: 'Toni Montez', role: 'Organizer' },
    { id: 'p-morgan', name: 'Morgan Montez', role: 'Wife' },
    { id: 'p-tatum', name: 'Tatum Montez', role: 'Daughter (infant)' },
    { id: 'p-leah', name: 'Leah Montez', role: 'Mom' },
    { id: 'p-tony', name: 'Tony Montez', role: 'Dad' },
    { id: 'p-laura', name: 'Laura Goodwin', role: 'Mother-in-law · Tatum care on wedding day' },
    { id: 'p-mark', name: 'Mark Goodwin', role: 'Father-in-law · Tatum care on wedding day' },
    { id: 'p-mikayla', name: 'Mikayla Goodwin', role: 'Sister-in-law · Tentative · Tatum care on wedding day' },
    { id: 'p-courtney', name: 'Courtney', role: 'Tentative · Tatum care on wedding day' },
  ],

  contacts: [
    { id: 'c-emerg', label: 'Emergency (US)', value: '911', kind: 'phone' },
    { id: 'c-couple', label: 'Tyler & Yui — wedding site', value: 'https://www.zola.com/wedding/yuiandtyler', kind: 'url', notes: 'Wedding site access details are shared privately.' },
    { id: 'c-rental-text', label: 'Beach Time Rentals — contact', value: 'Use booking email or rental portal; confirmation stored privately.', kind: 'text' },
    { id: 'c-rental-office', label: 'Beach Time Rentals — website', value: 'https://www.beachtimerentals.com/', kind: 'url' },
    { id: 'c-rental-email', label: 'Beach Time Rentals — email', value: 'customerservice@beachtimerentals.com', kind: 'text' },
    { id: 'c-airport', label: 'Tampa International Airport', value: 'https://www.tampaairport.com/', kind: 'url' },
    { id: 'c-enterprise-tpa', label: 'Enterprise TPA rental counter', value: 'https://www.enterprise.com/', kind: 'url', notes: '5405 Airport Service Rd, Tampa, FL 33607 · 24 hours.' },
  ],

  checklist: [
    // Flights
    { id: 'ck-fl-1', title: 'Book outbound flights', category: 'Flights', done: true, notes: 'Toni, Morgan, Tatum, Leah, and Tony fly to Tampa together on American Airlines flight 2516. Mark & Laura driving.' },
    { id: 'ck-fl-2', title: 'Record Toni + Morgan + Tatum return flight', category: 'Flights', done: true, notes: 'Toni, Morgan, and Tatum return to Dallas on American Airlines flight 1957 at 3:52 PM.' },
    { id: 'ck-fl-3', title: 'Note Leah + Tony return separately', category: 'Flights', done: true, notes: 'They return Sept 8 separately from Toni/Morgan/Tatum. Details are intentionally not tracked here.' },
    { id: 'ck-fl-4', title: 'Store American Airlines confirmation numbers privately', category: 'Flights', done: false, notes: 'Keep private confirmation numbers outside the public planner.' },
    { id: 'ck-fl-5', title: 'Select seats (sit together + near grandparents)', category: 'Flights', done: false },
    { id: 'ck-fl-6', title: 'Confirm Tatum infant ticket both ways', category: 'Flights', done: true, notes: 'Tatum is flying with Toni and Morgan both ways.' },
    { id: 'ck-fl-7', title: 'Download airline apps + boarding passes', category: 'Flights', done: false },
    { id: 'ck-fl-8', title: 'Check baggage allowances', category: 'Flights', done: false },

    // Stay
    { id: 'ck-st-1', title: 'Confirm Beach Time rental booking', category: 'Stay', done: true },
    { id: 'ck-st-2', title: 'Make final $2,437.50 payment (due Aug 4)', category: 'Stay', done: false },
    { id: 'ck-st-3', title: 'Get private entry details from Beach Time Rentals', category: 'Stay', done: false, notes: 'Check-in confirmed for 4:00 PM Sept 3 · keep private access details outside the public planner.' },
    { id: 'ck-st-4', title: 'Confirm final bed and cost-share plan', category: 'Stay', done: false, notes: 'Base split is 3 shares: Toni/Morgan, Leah/Tony, Mark/Laura. If Mikayla + Courtney come, split the place 4 ways.' },
    { id: 'ck-st-5', title: 'Confirm pack & play / crib', category: 'Stay', done: false },
    { id: 'ck-st-6', title: 'Share private address and Wi-Fi with everyone', category: 'Stay', done: false, notes: 'Use the group chat for exact address and Wi-Fi details.' },
    { id: 'ck-st-7', title: 'Pack own toiletries (property only provides starter)', category: 'Stay', done: false },

    // Transport
    { id: 'ck-tr-1', title: 'Decide rental car count', category: 'Transport', done: true, notes: 'One rental at TPA for Toni/Morgan/Tatum + Leah/Tony. Mark & Laura driving their own.' },
    { id: 'ck-tr-2', title: 'Reserve rental car', category: 'Transport', done: true, notes: 'Enterprise via Costco Travel · confirmation stored privately · Large SUV · pickup Sept 3 10:00 AM at TPA · drop-off Sept 8 1:00 PM · $376.93 due at agency.' },
    { id: 'ck-tr-3', title: 'Confirm infant car seat for the rental', category: 'Transport', done: false, notes: 'Screenshots do not show a car seat included; bring ours or add one with Enterprise before arrival.' },
    { id: 'ck-tr-4', title: 'Coordinate airport pickups', category: 'Transport', done: false, notes: 'Rental handles Toni/Morgan/Tatum/Leah/Tony. Mark & Laura arriving separately by car.' },
    { id: 'ck-tr-5', title: 'Share arrival/departure times in group chat', category: 'Transport', done: false },
    { id: 'ck-tr-6', title: 'Plan for 2-car parking max at property', category: 'Transport', done: true, notes: 'Locked: rental + Mark & Laura\'s car = the 2 allowed. Large rental SUV may not fully fit inside the garage, but can still park there.' },

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
    ...dogChecklistItems(),

    // Wedding
    { id: 'ck-we-1', title: 'RSVP wedding attendees on Zola', category: 'Wedding', done: false, notes: 'Attending: Toni, Morgan, Leah, Tony. Mark, Laura, Mikayla/Courtney if present, and Tatum are not attending the wedding. Wedding site access details are shared privately.' },
    { id: 'ck-we-2', title: 'Confirm ceremony & reception time + venue', category: 'Wedding', done: true, notes: 'Sun Sept 6 · 11:30 AM – 3:00 PM · Red Mesa Events · 128 3rd St S, St. Petersburg FL 33701' },
    { id: 'ck-we-3', title: 'Confirm dress code', category: 'Wedding', done: true, notes: 'Cocktail / business casual — brunch vibes.' },
    { id: 'ck-we-4', title: 'Wedding-day Tatum care plan', category: 'Wedding', done: true, notes: 'Mark, Laura, and Mikayla/Courtney if present watch Tatum at the house while Toni, Morgan, Leah, and Tony attend.' },
    { id: 'ck-we-5', title: 'Transportation to/from venue', category: 'Wedding', done: false, notes: 'Wedding crew only: Toni, Morgan, Leah, and Tony. Budget extra for parking near Red Mesa Events.' },
    { id: 'ck-we-6', title: 'Wedding card / gift optional', category: 'Wedding', done: false, notes: 'Leave as optional; do not include in the tracked trip budget.' },

    // Admin
    { id: 'ck-ad-1', title: 'Save Beach Time Rentals contact privately', category: 'Admin', done: true, notes: 'Confirmation and direct contact details are stored outside the public planner.' },
    { id: 'ck-ad-2', title: 'Share emergency contact list', category: 'Admin', done: false, notes: 'Tap "Copy everyone" on the People page to paste into the group chat.' },
    { id: 'ck-ad-3', title: 'Sign Short Term Rental Agreement', category: 'Admin', done: false, notes: 'Adobe Acrobat Sign link emailed by Beach Time Rentals.' },
    { id: 'ck-ad-4', title: 'Confirm Sat Orlando visit plans with Dad', category: 'Admin', done: false, notes: 'Address, arrival time, cookout vs not. ~2 hr each way.' },
  ],

  packing: [
    { id: 'pk-docs-id', title: 'Photo IDs', category: 'Travel docs', quantity: 'Adults' },
    { id: 'pk-docs-flight', title: 'Flight confirmations / boarding passes', category: 'Travel docs' },
    { id: 'pk-docs-wedding', title: 'Wedding invite / Zola details', category: 'Travel docs', notes: 'Private wedding-site access details are shared outside the public planner.' },
    { id: 'pk-clothes-outfits', title: 'Casual beach outfits', category: 'Clothes', quantity: '5 days' },
    { id: 'pk-clothes-sleep', title: 'Sleepwear', category: 'Clothes' },
    { id: 'pk-clothes-laundry', title: 'Laundry bag', category: 'Clothes' },
    { id: 'pk-toiletries-basics', title: 'Toiletries', category: 'Toiletries', notes: 'Rental only provides starter toiletries.' },
    { id: 'pk-toiletries-meds', title: 'Medicine / prescriptions', category: 'Toiletries' },
    { id: 'pk-beach-swimsuits', title: 'Swimsuits', category: 'Beach / Pool', quantity: '2 each' },
    { id: 'pk-beach-sunscreen', title: 'Sunscreen', category: 'Beach / Pool' },
    { id: 'pk-beach-towels', title: 'Beach towels / coverups', category: 'Beach / Pool' },
    { id: 'pk-beach-shade', title: 'Beach shade / tent', category: 'Beach / Pool', assignedTo: 'Tatum crew' },
    { id: 'pk-wedding-outfits', title: 'Wedding outfits', category: 'Wedding / Event', notes: 'Cocktail / business casual brunch vibes.' },
    { id: 'pk-wedding-shoes', title: 'Wedding shoes', category: 'Wedding / Event' },
    { id: 'pk-wedding-gift', title: 'Wedding card / gift (optional)', category: 'Wedding / Event', notes: 'Not included in the tracked group budget.' },
    { id: 'pk-baby-diapers', title: 'Diapers + wipes', category: 'Baby', assignedTo: 'Tatum' },
    { id: 'pk-baby-swim', title: 'Swim diapers + baby sunscreen', category: 'Baby', assignedTo: 'Tatum' },
    { id: 'pk-baby-sleep', title: 'Pack & play / sleep plan items', category: 'Baby', assignedTo: 'Tatum' },
    { id: 'pk-tech-chargers', title: 'Phone chargers', category: 'Tech' },
    { id: 'pk-tech-battery', title: 'Portable battery', category: 'Tech' },
    { id: 'pk-dogs-care', title: 'Dog care confirmed at home', category: 'Dogs', notes: 'Use checklist for the handoff tasks.' },
  ],

  budget: [
    {
      id: 'b-stay',
      name: 'Beach Time rental (Exclusive Isla Bonita)',
      total: 3547.5,
      splitCount: 3,
      status: 'confirmed',
      notes:
        '5 nights · Base $2,625 · Fees $514.38 (incl. $110 property protection) · Tax $408.12. ' +
        '$1,110 paid, $2,437.50 due Aug 4. Current split is 3 shares = $1,182.50/share. If Mikayla + Courtney come, split 4 ways = $886.88/share. All payments non-refundable.',
    },
    {
      id: 'b-car',
      name: 'Rental car (Enterprise via Costco)',
      total: 376.93,
      splitCount: 2,
      status: 'confirmed',
      notes:
        'Confirmation details stored privately. Reserved now, pay later. $0.00 paid; $376.93 due at agency. Split between Toni/Morgan and Leah/Tony only; Mark/Laura excluded.',
    },
    { id: 'b-groceries', name: 'Groceries (estimate)', total: 300, splitCount: 6, status: 'estimate', notes: 'Placeholder — tune as we plan meals.' },
    { id: 'b-gift', name: 'Wedding gift (optional)', total: 0, splitCount: 1, status: 'tbd', notes: 'Optional; decide separately. Excluded from the tracked group total.' },
  ],
}
