import { useEffect, useState } from 'react'

type Props = {
  text: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function CopyButton({ text, label = 'Copy for text', className = '', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } catch {
        // no-op
      }
      document.body.removeChild(ta)
    }
  }

  const padding = size === 'md' ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? 'Copied' : label}
      className={`inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white text-slate-700 font-medium shadow-sm active:scale-95 transition whitespace-nowrap ${padding} ${className}`}
    >
      <span aria-hidden>{copied ? '✅' : '📋'}</span>
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  )
}
