'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export function HomeDateTime() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm min-h-[4.5rem]"
        aria-hidden
      />
    )
  }

  const dateLine = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeLine = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="text-xs uppercase tracking-wide">Local time</span>
      </div>
      <p className="text-sm text-gray-800 leading-snug">{dateLine}</p>
      <p className="text-xl text-gray-900 tabular-nums mt-1" suppressHydrationWarning>
        {timeLine}
      </p>
    </div>
  )
}
