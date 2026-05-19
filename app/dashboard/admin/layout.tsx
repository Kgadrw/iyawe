import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUserFromCookie } from '@/lib/server-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-blue-50/40">
      <header className="traffic-header">
        <div className="traffic-header-stripes" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 traffic-header-body">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-lg font-bold text-white hover:text-gold-400 transition-colors">
              Subizwa | Admin
            </Link>
            <nav className="hidden gap-4 text-sm font-medium traffic-header-muted md:flex">
              <Link className="hover:text-white" href="/dashboard/admin">
                Overview
              </Link>
              <Link className="hover:text-white" href="/dashboard/officer">
                Officer View
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm traffic-header-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button
                className="rounded-md border-2 border-gold-400 bg-gold-400 px-3 py-1.5 font-medium text-blue-900 hover:bg-gold-300"
                type="submit"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
        <div className="traffic-header-foot" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
