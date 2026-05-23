import { redirect } from 'next/navigation'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { SubizwaAdminShell } from '@/components/platform/SubizwaAdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/dashboard')

  return <SubizwaAdminShell userEmail={user.email}>{children}</SubizwaAdminShell>
}
