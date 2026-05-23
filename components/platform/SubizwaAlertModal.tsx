'use client'

import * as React from 'react'
import { Bell, FileCheck, LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type AlertModalVariant = 'watch' | 'claim'

const VARIANT_META: Record<
  AlertModalVariant,
  { icon: LucideIcon; accent: string; badge: string }
> = {
  watch: {
    icon: Bell,
    accent: 'from-[#0c2340] to-[#132f52]',
    badge: 'Watch alert',
  },
  claim: {
    icon: FileCheck,
    accent: 'from-[#0c2340] to-[#1a3d6b]',
    badge: 'Claim document',
  },
}

type SubizwaAlertModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: AlertModalVariant
  title: string
  description?: React.ReactNode
  /** Optional highlight below description (e.g. station name) */
  highlight?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'md' | 'lg' | '3xl'
}

const maxWidthClass = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  '3xl': 'sm:max-w-3xl',
}

export function SubizwaAlertModal({
  open,
  onOpenChange,
  variant,
  title,
  description,
  highlight,
  children,
  footer,
  maxWidth = 'lg',
}: SubizwaAlertModalProps) {
  const meta = VARIANT_META[variant]
  const Icon = meta.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'gap-0 p-0 overflow-hidden border-0 shadow-2xl rounded-2xl',
          'w-[95vw]',
          maxWidthClass[maxWidth],
          '[&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:z-10',
          '[&>button]:text-white/80 [&>button]:hover:text-white [&>button]:hover:bg-white/10',
          '[&>button]:rounded-full [&>button]:p-1.5 [&>button]:opacity-100',
          '[&>button]:ring-0 [&>button]:focus:ring-2 [&>button]:focus:ring-gold-400/50'
        )}
      >
        <div className="traffic-header-stripes h-1.5 shrink-0" aria-hidden="true" />

        <div
          className={cn(
            'relative px-6 pt-5 pb-4 bg-gradient-to-br text-white',
            meta.accent
          )}
        >
          <div className="flex gap-4 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/20 border border-gold-400/40">
              <Icon className="h-5 w-5 text-gold-400" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-gold-400">
                {meta.badge}
              </span>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-white leading-snug">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription asChild>
                  <div className="text-sm text-white/75 font-normal leading-relaxed">
                    {description}
                  </div>
                </DialogDescription>
              ) : null}
            </div>
          </div>

          {highlight ? (
            <div className="mt-4 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white/90">
              {highlight}
            </div>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold-400/80" aria-hidden />
        </div>

        <div className="bg-white px-6 py-5">{children}</div>

        {footer ? (
          <div className="bg-gray-50/80 border-t border-gray-100 px-6 py-4">{footer}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Shared form field styles for alert modals */
export const alertFieldClass =
  'h-10 text-sm text-blue-900 border-gray-200 rounded-xl bg-white placeholder:text-blue-900/40 focus-visible:ring-2 focus-visible:ring-blue-900/20 focus-visible:border-blue-900/30'

export const alertLabelClass = 'text-xs font-semibold text-blue-900/80'

export const alertPrimaryButtonClass =
  'rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-sm h-10 px-6'

export const alertGhostButtonClass =
  'rounded-full text-blue-900/70 hover:text-blue-900 hover:bg-blue-50 h-10 px-4'
