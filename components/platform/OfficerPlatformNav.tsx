'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileStack,
  Package,
  Clock,
  CheckCircle2,
  User,
  Home,
  Users,
  Shield,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof FileStack
  exact?: boolean
  external?: boolean
  matchQuery?: string
}

function buildNavItems(role: string): NavItem[] {
  const items: NavItem[] = [
    {
      href: '/dashboard/officer',
      label: 'All documents',
      icon: FileStack,
      matchQuery: 'all',
    },
    {
      href: '/dashboard/officer?filter=at_station',
      label: 'At station',
      icon: Package,
      matchQuery: 'at_station',
    },
    {
      href: '/dashboard/officer?filter=claim_pending',
      label: 'Claims',
      icon: Clock,
      matchQuery: 'claim_pending',
    },
    {
      href: '/dashboard/officer?filter=collected',
      label: 'Collected',
      icon: CheckCircle2,
      matchQuery: 'collected',
    },
    { href: '/dashboard/officer/account', label: 'Profile', icon: User, exact: true },
    { href: '/', label: 'Homepage', icon: Home, external: true },
  ]

  if (role === 'ADMIN') {
    items.splice(items.length - 1, 0, {
      href: '/dashboard/admin',
      label: 'Admin',
      icon: Shield,
      exact: true,
    })
    items.splice(items.length - 1, 0, {
      href: '/dashboard/admin/staff',
      label: 'Staff',
      icon: Users,
      exact: true,
    })
  }

  return items
}

function isActive(pathname: string, searchParams: URLSearchParams, item: NavItem) {
  if (item.external) return false
  if (item.matchQuery) {
    if (pathname !== '/dashboard/officer') return false
    const f = searchParams.get('filter') || 'all'
    return item.matchQuery === f
  }
  if (item.exact) return pathname === item.href.split('?')[0]
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function OfficerPlatformNav({ role }: { role: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const items = buildNavItems(role)

  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, searchParams, item)
        const className = cn(
          'h-9 sm:h-10 px-3 sm:px-4 rounded-full flex-shrink-0 text-xs sm:text-sm transition-colors inline-flex items-center gap-1.5',
          active
            ? 'bg-blue-900 text-white font-semibold'
            : 'bg-white/10 text-white/90 font-medium hover:bg-white/20'
        )

        if (item.external) {
          return (
            <a key={item.label} href={item.href} className={className}>
              <Icon
                className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', active ? 'text-gold-400' : 'text-gold-400/80')}
              />
              <span className="hidden sm:inline">{item.label}</span>
            </a>
          )
        }

        return (
          <Link key={item.href + item.label} href={item.href} className={className} title={item.label}>
            <Icon
              className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', active ? 'text-gold-400' : 'text-gold-400/80')}
            />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
