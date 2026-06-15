'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Eye, Home, FileQuestion, Clock } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/admin/staff', label: 'Staff accounts', icon: Users, exact: false },
  { href: '/dashboard/admin/lost', label: 'Lost & waiting', icon: FileQuestion, exact: false },
  { href: '/dashboard/admin/claims', label: 'Claims', icon: Clock, exact: false },
  { href: '/dashboard/officer', label: 'Officer view', icon: Eye, exact: false },
  { href: '/', label: 'Public site', icon: Home, exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminPlatformNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'h-9 sm:h-10 px-3 sm:px-4 rounded-full flex-shrink-0 text-xs sm:text-sm transition-colors inline-flex items-center gap-1.5',
              active
                ? 'bg-blue-900 text-white font-semibold'
                : 'bg-white/10 text-white/90 font-medium hover:bg-white/20'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', active ? 'text-gold-400' : 'text-gold-400/80')} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
