'use client'

import type { PublicAd } from '@/lib/ads'
import { cn } from '@/lib/utils'

function AdLink({
  ad,
  className,
  imageClassName,
  children,
}: {
  ad: PublicAd
  className?: string
  imageClassName?: string
  children?: React.ReactNode
}) {
  return (
    <a
      href={ad.link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('block w-full group', className)}
      title={ad.title || 'Advertisement'}
    >
      <div className="overflow-hidden bg-white border border-gray-100 rounded-lg shadow-sm group-hover:shadow-md transition-shadow h-full">
        <img
          src={ad.image}
          alt={ad.title || 'Advertisement'}
          className={cn('w-full object-cover', imageClassName)}
        />
      </div>
      {children}
    </a>
  )
}

function AdPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400',
        compact ? 'h-16 sm:h-20' : 'min-h-[120px] p-6'
      )}
    >
      Ad space
    </div>
  )
}

/** Two small horizontal banners directly below the site header (max 2). */
export function AdBannerTopRow({
  ads,
  loading,
  className,
}: {
  ads: PublicAd[]
  loading?: boolean
  className?: string
}) {
  const slots = [0, 1] as const

  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3', className)}>
        {slots.map((i) => (
          <div
            key={i}
            className="h-16 sm:h-20 rounded-lg bg-gray-100 animate-pulse border border-gray-200"
          />
        ))}
      </div>
    )
  }

  const active = ads.slice(0, 2)
  if (active.length === 0) return null

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3', className)}>
      {slots.map((slot) => {
        const ad = active[slot]
        if (!ad) {
          return <AdPlaceholder key={slot} compact />
        }
        return (
          <AdLink
            key={ad.id}
            ad={ad}
            imageClassName="h-16 sm:h-20 object-cover"
          />
        )
      })}
    </div>
  )
}

/** Vertical ads in the right column (desktop). */
export function AdSidebarStack({
  ads,
  loading,
  className,
}: {
  ads: PublicAd[]
  loading?: boolean
  className?: string
}) {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="min-h-[120px] rounded-xl bg-gray-100 animate-pulse border border-gray-200" />
      </div>
    )
  }

  if (ads.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <AdPlaceholder />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {ads.map((ad) => (
        <AdLink key={ad.id} ad={ad} imageClassName="h-auto max-h-64 object-cover" />
      ))}
    </div>
  )
}
