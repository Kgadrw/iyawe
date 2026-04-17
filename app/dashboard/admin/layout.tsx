import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUserFromCookie } from '@/lib/server-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-lg font-semibold">
              Admin Dashboard
            </Link>
            <nav className="hidden gap-4 text-sm text-slate-600 md:flex">
              <Link className="hover:text-slate-900" href="/dashboard/admin">
                Overview
              </Link>
              <Link className="hover:text-slate-900" href="/dashboard/officer">
                Officer View
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{user.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-md border px-3 py-1.5 hover:bg-slate-50" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

