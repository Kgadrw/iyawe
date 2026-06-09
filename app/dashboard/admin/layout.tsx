import { redirect } from 'next/navigation'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { SubizwaAdminShell } from '@/components/platform/SubizwaAdminShell'
import { STAFF_LOGIN_PATH } from '@/lib/dashboard-routes'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect(STAFF_LOGIN_PATH)
  if (user.role !== 'ADMIN') redirect('/dashboard')

  return <SubizwaAdminShell userEmail={user.email}>{children}</SubizwaAdminShell>
}
