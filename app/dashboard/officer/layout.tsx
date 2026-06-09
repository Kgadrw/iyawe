import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { getStaffStationContext } from '@/lib/station-scope'
import { OfficerPlatformNav } from '@/components/platform/OfficerPlatformNav'
import { STAFF_LOGIN_PATH } from '@/lib/dashboard-routes'

export default async function OfficerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect(STAFF_LOGIN_PATH)
  if (user.role !== 'OFFICER' && user.role !== 'ADMIN' && user.role !== 'INSTITUTION') redirect('/dashboard')

  const stationCtx = await getStaffStationContext(user.userId)

  const roleLabel =
    user.role === 'ADMIN' ? 'Admin (Officer view)' : user.role === 'INSTITUTION' ? 'Institution' : 'Officer'

  return (
    <div className="min-h-screen bg-blue-50/40">
      <header className="traffic-header">
        <div className="traffic-header-stripes" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4 traffic-header-body">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/dashboard/officer"
                className="text-lg sm:text-xl font-bold text-white hover:text-gold-400 transition-colors shrink-0"
              >
                Subizwa | {roleLabel}
              </Link>

              <div className="flex items-center gap-2 sm:gap-3 text-sm traffic-header-muted shrink-0">
                {stationCtx.stationName ? (
                  <span
                    className="hidden lg:inline max-w-[140px] truncate text-xs text-gold-400/90"
                    title={stationCtx.stationName}
                  >
                    {stationCtx.stationName}
                  </span>
                ) : null}
                <Link
                  href="/dashboard/officer/account"
                  className="hidden md:inline text-xs hover:text-white truncate max-w-[120px]"
                  title={user.email}
                >
                  {user.email}
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    className="rounded-full border-2 border-gold-400 bg-gold-400 px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-900 hover:bg-gold-300"
                    type="submit"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>

            <Suspense fallback={null}>
              <OfficerPlatformNav role={user.role} />
            </Suspense>
          </div>
        </div>
        <div className="traffic-header-foot" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

