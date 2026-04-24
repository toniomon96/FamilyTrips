import type { Trip } from '../../types/trip'

export const loganBachelor: Trip = {
  slug: 'logan-bachelor',
  name: 'Logan Bachelor Party',
  location: 'Birmingham, AL / Mt. Olive, AL',
  startDate: '2026-05-21',
  endDate: '2026-05-24',
  visibility: 'unlisted',
  currency: '$',
  tagline: 'A planned weekend for Logan instead of just winging it',

  stay: {
    name: "Logan's Crib",
    address: '1771 Dixon Circle, Mt. Olive, Alabama 35117',
    checkIn: 'Thursday, May 21, 2026 - arrival around 2:00 AM',
    checkOut: 'Sunday, May 24, 2026 - head out after brunch',
    amenities: [
      'Home base for the weekend',
      'Mt. Olive / Birmingham area',
      'Easy jumping-off point for Lakeview and downtown',
      'Arrival timing depends on Braden practice schedule',
    ],
    notes:
      'The plan assumes most of the group leaves after Braden practice on Thursday night, eats in Little Rock, and gets into Birmingham late. ' +
      'Mills may arrive earlier if Braden has Friday afternoon practice. Keep the final arrival plan in the group chat.',
  },

  bookings: [
    {
      id: 'stay',
      kind: 'stay',
      title: "Logan's Crib",
      details:
        'Home base at 1771 Dixon Circle, Mt. Olive, AL 35117. Arrival expected late Thursday / early Friday depending on Braden practice and group travel.',
      when: '2026-05-21',
    },
    {
      id: 'drive',
      kind: 'car',
      title: 'Drive to Birmingham / Mt. Olive',
      details:
        "Leave after Braden's practice on Thursday night. Dinner stop in Little Rock. Arrive in Birmingham around 2:00 AM per the draft plan.",
      when: '2026-05-21',
    },
    {
      id: 'recovery',
      kind: 'activity',
      title: 'Recovery block - IV / sauna / cold plunge',
      details:
        'Friday morning option: RCVRY House / Healing Waters. Needs booking or responsibility split closer to the trip.',
      when: '2026-05-22',
    },
    {
      id: 'golf',
      kind: 'activity',
      title: 'Saturday golf',
      details:
        'Saturday midday tee time target. Draft plan names Quail Ridge, possibly Castle Pines or Mountain View, with farther-away backups Highland Park and Country Club of Birmingham.',
      when: '2026-05-23',
    },
    {
      id: 'dinner',
      kind: 'activity',
      title: 'Saturday nice dinner',
      details:
        "Book a steak / nicer dinner for Saturday night. Options from the draft: Ruth's Chris, Texas de Brazil, or Michael's Steak & Seafood.",
      when: '2026-05-23',
    },
  ],

  itinerary: [
    {
      date: '2026-05-21',
      title: 'Travel night',
      items: [
        {
          time: '6:00 PM',
          title: "Depart after Braden's practice",
          address: 'North Little Rock, AR',
          notes:
            'Exact departure depends on practice. Mills may come earlier if Braden has Friday afternoon practice.',
        },
        {
          title: 'Dinner - On the slab',
          address: 'Little Rock, AR',
          notes: 'Use this as the loose dinner stop on the drive.',
        },
        {
          time: '2:00 AM',
          title: 'Arrive in Birmingham / Mt. Olive',
          address: '1771 Dixon Circle, Mt. Olive, Alabama 35117',
          notes: "Late arrival at Logan's crib.",
        },
      ],
    },
    {
      date: '2026-05-22',
      title: 'Recovery, Lakeview, and food hall',
      items: [
        {
          time: '8:00 AM',
          title: 'Wake up and hike Ruffner Mountain',
          address: 'Ruffner Mountain, Birmingham, AL',
          notes: 'Draft bar/sidebar note: Sidebar in Lakeview.',
        },
        {
          title: 'Breakfast - Woodlawn Marketplace',
          address: 'Woodlawn Marketplace, Birmingham, AL',
          notes: 'Close to Ruffner Mountain. Draft bar note: Tin Roof in Lakeview.',
        },
        {
          time: '9:00 AM',
          title: 'IV / sauna / cold plunge',
          address: 'RCVRY House / Healing Waters, Birmingham, AL',
          notes: 'Book or split responsibility for this closer to the trip.',
        },
        {
          title: 'Shower up at the house',
          notes: 'Reset before lunch / brewery block. Draft bar note: The Church Key in Lakeview.',
        },
        {
          time: '1:00 - 2:00 PM',
          title: 'Brewery / late lunch - TrimTab Brewing Co.',
          address: 'TrimTab Brewing Co., Birmingham, AL',
          notes: 'Lakeview area. Could also play golf, Topgolf, basketball, pickleball, or just chill.',
        },
        {
          time: '6:45 PM',
          title: 'Dinner - Pizitz Food Hall',
          address: 'Pizitz Food Hall, Birmingham, AL',
        },
        {
          time: '7:45 PM',
          title: 'Lakeview District bars',
          address: 'Lakeview District, Birmingham, AL',
          notes: 'Hit the Lakeview bars after dinner.',
        },
      ],
    },
    {
      date: '2026-05-23',
      title: 'Coffee, golf, steak dinner, downtown',
      items: [
        {
          time: '8:00 AM',
          title: 'Breakfast / coffee - Santos Coffee',
          address: 'Santos Coffee, Gardendale, AL',
          notes: 'Draft bar option: Neon Moon downtown.',
        },
        {
          time: '9:00 AM',
          title: 'Pickleball / basketball',
          address: 'Bill Noble Park, Gardendale, AL',
          notes: 'Draft bar option: The Collins Bar downtown.',
        },
        {
          time: '12:00 PM',
          title: 'Golf tee time',
          address: 'Quail Ridge, Birmingham, AL',
          notes:
            'Draft options: Quail Ridge, possibly Castle Pines or Mountain View. Backup farther-away courses: Highland Park Golf Course and Country Club of Birmingham.',
        },
        {
          title: 'Lunch at the golf course',
          notes: 'Keep lunch easy while golfing.',
        },
        {
          time: '4:00 PM',
          title: 'Shower up and get ready',
          notes:
            'Downtown bar ideas from the draft: The Margaret, V Lounge Karaoke, House of Found Objects, Pilcrow Cocktail Cellar.',
        },
        {
          time: '6:00 - 8:00 PM',
          title: 'Nice dinner',
          address: 'Downtown Birmingham, AL',
          notes:
            "Book one: Ruth's Chris, Texas de Brazil, or Michael's Steak & Seafood.",
        },
        {
          title: 'Downtown bars',
          address: 'Downtown Birmingham, AL',
          notes: 'Hit the bars downtown after dinner.',
        },
      ],
    },
    {
      date: '2026-05-24',
      title: 'Brunch and head out',
      items: [
        {
          title: 'Wake up and hang out',
          notes: 'No rush in the draft plan.',
        },
        {
          title: 'Brunch - The Ville Cafe',
          address: 'The Ville Cafe, Birmingham, AL',
        },
        {
          title: 'Head out',
          notes: 'Share ETAs in the group chat.',
        },
      ],
    },
  ],

  thingsToDo: [
    {
      id: 'td-ruffner',
      name: 'Ruffner Mountain',
      category: 'Hike',
      address: 'Ruffner Mountain, Birmingham, AL',
      url: 'https://maps.google.com/?q=Ruffner+Mountain+Birmingham+AL',
      notes: 'Friday morning hike option.',
    },
    {
      id: 'td-woodlawn',
      name: 'Woodlawn Marketplace',
      category: 'Breakfast',
      address: 'Woodlawn Marketplace, Birmingham, AL',
      url: 'https://maps.google.com/?q=Woodlawn+Marketplace+Birmingham+AL',
      notes: 'Breakfast near Ruffner Mountain.',
    },
    {
      id: 'td-rcvry',
      name: 'RCVRY House / Healing Waters',
      category: 'Recovery',
      address: 'Birmingham, AL',
      url: 'https://maps.google.com/?q=RCVRY+House+Healing+Waters+Birmingham+AL',
      notes: 'IV / sauna / cold plunge block. Needs reservation follow-up.',
    },
    {
      id: 'td-trimtab',
      name: 'TrimTab Brewing Co.',
      category: 'Brewery',
      address: 'Birmingham, AL',
      url: 'https://maps.google.com/?q=TrimTab+Brewing+Co+Birmingham+AL',
      notes: 'Friday late lunch / brewery in the Lakeview area.',
    },
    {
      id: 'td-pizitz',
      name: 'Pizitz Food Hall',
      category: 'Dinner',
      address: 'Birmingham, AL',
      url: 'https://maps.google.com/?q=Pizitz+Food+Hall+Birmingham+AL',
      notes: 'Friday dinner target.',
    },
    {
      id: 'td-lakeview-bars',
      name: 'Lakeview District bars',
      category: 'Bars',
      address: 'Lakeview District, Birmingham, AL',
      url: 'https://maps.google.com/?q=Lakeview+District+Birmingham+AL',
      notes: 'Draft options: Sidebar, Tin Roof, The Church Key.',
    },
    {
      id: 'td-santos',
      name: 'Santos Coffee - Gardendale',
      category: 'Coffee',
      address: 'Gardendale, AL',
      url: 'https://maps.google.com/?q=Santos+Coffee+Gardendale+AL',
      notes: 'Saturday breakfast / coffee.',
    },
    {
      id: 'td-bill-noble',
      name: 'Bill Noble Park',
      category: 'Sports',
      address: 'Gardendale, AL',
      url: 'https://maps.google.com/?q=Bill+Noble+Park+Gardendale+AL',
      notes: 'Pickleball / basketball option.',
    },
    {
      id: 'td-golf',
      name: 'Golf options',
      category: 'Golf',
      address: 'Birmingham, AL',
      url: 'https://maps.google.com/?q=golf+courses+Birmingham+AL',
      notes:
        'Primary draft options: Quail Ridge, Castle Pines, or Mountain View. Backups: Highland Park Golf Course and Country Club of Birmingham.',
    },
    {
      id: 'td-steak',
      name: 'Saturday nice dinner options',
      category: 'Dinner',
      address: 'Downtown Birmingham, AL',
      url: 'https://maps.google.com/?q=steakhouse+downtown+Birmingham+AL',
      notes: "Draft options: Ruth's Chris, Texas de Brazil, or Michael's Steak & Seafood.",
    },
    {
      id: 'td-downtown-bars',
      name: 'Downtown bars',
      category: 'Bars',
      address: 'Downtown Birmingham, AL',
      url: 'https://maps.google.com/?q=bars+downtown+Birmingham+AL',
      notes:
        'Draft options: Neon Moon, The Collins Bar, The Margaret, V Lounge Karaoke, House of Found Objects, Pilcrow Cocktail Cellar.',
    },
  ],

  people: [
    { id: 'p-logan', name: 'Logan', role: 'Bachelor' },
    { id: 'p-mills', name: 'Mills', role: 'Planner / guest' },
    { id: 'p-braden', name: 'Braden', role: 'Arrival timing depends on practice' },
    { id: 'p-toni', name: 'Toni', role: 'Planner / guest' },
  ],

  contacts: [
    { id: 'c-emerg', label: 'Emergency (US)', value: '911', kind: 'phone' },
    {
      id: 'c-stay-map',
      label: "Logan's Crib - map",
      value: 'https://maps.google.com/?q=1771+Dixon+Circle+Mt+Olive+AL+35117',
      kind: 'url',
      notes: 'Direct map link for the home base.',
    },
  ],

  checklist: [
    {
      id: 'ck-travel-arrivals',
      title: 'Confirm who arrives Thursday night vs Friday',
      category: 'Travel',
      done: false,
      notes:
        'Mills may come earlier if Braden has Friday afternoon practice. Lock the plan in the group chat.',
    },
    {
      id: 'ck-travel-departure',
      title: "Confirm departure time after Braden's practice",
      category: 'Travel',
      done: false,
      notes: 'Draft plan says 6:00 PM Thursday from NLR.',
    },
    {
      id: 'ck-responsibilities',
      title: 'Split reservation responsibilities',
      category: 'Admin',
      done: false,
      notes: 'Recovery place, steak place, golf, and any other bookings.',
    },
    {
      id: 'ck-recovery-book',
      title: 'Book recovery place',
      category: 'Reservations',
      done: false,
      notes: 'RCVRY House / Healing Waters for IV, sauna, cold plunge.',
    },
    {
      id: 'ck-steak-book',
      title: 'Book steak / nice dinner',
      category: 'Reservations',
      done: false,
      notes: "Pick Ruth's Chris, Texas de Brazil, Michael's Steak & Seafood, or another downtown option.",
    },
    {
      id: 'ck-golf-tee-time',
      title: 'Lock golf course and tee time',
      category: 'Golf',
      done: false,
      notes: 'Quail Ridge, Castle Pines, Mountain View, Highland Park, or Country Club of Birmingham.',
    },
    {
      id: 'ck-lakeview-bars',
      title: 'Confirm Friday Lakeview bar plan',
      category: 'Bars',
      done: false,
      notes: 'Sidebar, Tin Roof, The Church Key, or decide live.',
    },
    {
      id: 'ck-downtown-bars',
      title: 'Confirm Saturday downtown bar plan',
      category: 'Bars',
      done: false,
      notes: 'Neon Moon, The Collins Bar, The Margaret, V Lounge, House of Found Objects, Pilcrow, or decide live.',
    },
    {
      id: 'ck-share-final-plan',
      title: 'Share final arrival/departure plan in group chat',
      category: 'Admin',
      done: false,
    },
    {
      id: 'ck-private-link',
      title: 'Share direct private trip link only with the bachelor group',
      category: 'Admin',
      done: false,
      notes: 'This trip is unlisted from the public trips index but anyone with the URL can open it.',
    },
  ],

  budget: [
    {
      id: 'b-recovery',
      name: 'Recovery block',
      total: 0,
      splitCount: 1,
      notes: 'Placeholder - update after booking IV / sauna / cold plunge.',
    },
    {
      id: 'b-golf',
      name: 'Golf',
      total: 0,
      splitCount: 1,
      notes: 'Placeholder - update after tee time is locked.',
    },
    {
      id: 'b-dinner',
      name: 'Saturday nice dinner',
      total: 0,
      splitCount: 1,
      notes: 'Placeholder - actual cost handled after the reservation / bill.',
    },
  ],
}
