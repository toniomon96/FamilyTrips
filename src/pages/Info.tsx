type InfoItem = {
  label: string
  value: string
  link?: string
  copyable?: boolean
}

type InfoSection = {
  title: string
  icon: string
  items: InfoItem[]
}

const INFO_SECTIONS: InfoSection[] = [
  {
    title: 'Airbnb',
    icon: '🏠',
    items: [
      { label: 'Address', value: 'Via del Sole 12, Tuscany, Italy' },
      { label: 'Check-in', value: 'July 15, 2025 at 3:00 PM' },
      { label: 'Check-out', value: 'July 22, 2025 at 11:00 AM' },
      { label: 'Booking Link', value: 'View on Airbnb', link: 'https://airbnb.com' },
    ],
  },
  {
    title: 'Wedding',
    icon: '💒',
    items: [
      { label: 'Date', value: 'July 19, 2025' },
      { label: 'Time', value: '4:00 PM' },
      { label: 'Venue', value: 'Villa Belvedere, Tuscany' },
      { label: 'Dress Code', value: 'Smart Casual' },
      { label: 'RSVP Link', value: 'RSVP on Zola', link: 'https://zola.com' },
      { label: 'Zola Password', value: 'FamilyTrip2025', copyable: true },
    ],
  },
  {
    title: 'Important Notes',
    icon: '📝',
    items: [
      { label: 'Emergency Contact', value: '+39 02 1234 5678' },
      { label: 'Nearest Hospital', value: 'Ospedale di Siena' },
      { label: 'Local Taxi', value: '+39 0577 123456' },
    ],
  },
]

export default function Info() {
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value).catch(() => {})
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Trip Info</h1>
        <p className="text-zinc-400 text-sm">Everything you need in one place</p>
      </div>

      {INFO_SECTIONS.map((section) => (
        <div key={section.title} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
            <span className="text-xl">{section.icon}</span>
            <h2 className="text-white font-semibold">{section.title}</h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4">
                <span className="text-zinc-400 text-sm">{item.label}</span>
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm font-medium"
                  >
                    {item.value} →
                  </a>
                ) : item.copyable ? (
                  <button
                    onClick={() => handleCopy(item.value)}
                    className="flex items-center gap-1 text-sm"
                  >
                    <span className="text-white font-mono bg-zinc-800 px-2 py-0.5 rounded">{item.value}</span>
                    <span className="text-zinc-500 text-xs">copy</span>
                  </button>
                ) : (
                  <span className="text-white text-sm text-right max-w-[55%]">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
