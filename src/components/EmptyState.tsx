type Props = {
  icon?: string
  title: string
  body?: string
}

export default function EmptyState({ icon = '📝', title, body }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div aria-hidden className="text-3xl mb-1">{icon}</div>
      <p className="font-medium text-slate-800">{title}</p>
      {body && <p className="text-sm text-slate-600 mt-1">{body}</p>}
    </div>
  )
}
