import type { ChecklistStatus } from '../hooks/useChecklistState'

type SyncStatusChipProps = {
  status: ChecklistStatus
}

export default function SyncStatusChip({ status }: SyncStatusChipProps) {
  if (status === 'online') return null

  const classes: Record<Exclude<ChecklistStatus, 'online'>, string> = {
    saving: 'bg-blue-50 text-blue-700 border-blue-200',
    offline: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }

  const label: Record<Exclude<ChecklistStatus, 'online'>, string> = {
    saving: 'Saving...',
    offline: 'Offline · changes stay here',
    error: "Couldn't save · try again",
  }

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classes[status]}`}
      role="status"
    >
      {label[status]}
    </span>
  )
}
