'use client'

import Link from 'next/link'
import { AdminPlatformNav } from './AdminPlatformNav'
type SubizwaAdminShellProps = {
  userEmail: string
  children: React.ReactNode
}

export function SubizwaAdminShell({ userEmail, children }: SubizwaAdminShellProps) {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <nav className="traffic-header fixed left-0 right-0 z-50">
        <div className="traffic-header-stripes" aria-hidden="true" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 traffic-header-body">
          <div className="flex flex-col gap-3 sm:gap-4 pb-3 sm:pb-4">
            <div className="flex h-12 sm:h-16 items-center justify-between gap-3">
              <Link href="/dashboard/admin" className="group flex flex-shrink-0 items-center">
                <div className="flex flex-col">
                  <span className="text-base sm:text-3xl font-bold text-white tracking-tight group-hover:opacity-90 transition-opacity">
                    Subizwa
                  </span>
                  <span className="text-xs text-gold-400 font-semibold hidden sm:block uppercase tracking-wide">
                    Found documents recovery
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-3 text-sm">
                <span className="hidden md:inline text-gold-400/90 text-xs sm:text-sm truncate max-w-[180px]">
                  {userEmail}
                </span>
                <span className="rounded-full bg-gold-400/20 border border-gold-400/40 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-gold-400 uppercase tracking-wide">
                  Admin
                </span>
                <form action="/api/auth/logout" method="post">
                  <button
                    className="rounded-full border-2 border-gold-400 bg-gold-400 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-blue-900 hover:bg-gold-300 transition-colors"
                    type="submit"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>

            <AdminPlatformNav />
          </div>
        </div>

        <div className="border-t border-white/15 bg-[#081a30]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-center">
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              <span className="text-gold-400/95 font-medium">Administration</span>
              <span className="hidden sm:inline"> — </span>
              <span className="block sm:inline mt-0.5 sm:mt-0">
                Manage staff accounts and monitor platform activity on the same Subizwa system the public uses.
              </span>
            </p>
          </div>
        </div>

        <div className="traffic-header-foot" aria-hidden="true" />
      </nav>

      <div className="container mx-auto px-2 sm:px-6 lg:px-8 pt-[11.5rem] sm:pt-[13.5rem] pb-12">
        {children}
      </div>

      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Subizwa. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xs text-gray-500 transition-colors hover:text-blue-600">
                Public homepage
              </Link>
              <a href="#" className="text-xs text-gray-500 transition-colors hover:text-blue-600">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-gray-500 transition-colors hover:text-blue-600">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
