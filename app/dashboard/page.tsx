import { redirect } from 'next/navigation'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { STAFF_LOGIN_PATH } from '@/lib/dashboard-routes'

export default async function DashboardIndex() {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect(STAFF_LOGIN_PATH)

  if (user.role === 'ADMIN') redirect('/dashboard/admin')
  if (user.role === 'OFFICER') redirect('/dashboard/officer')

  // Institutions can use officer workflow for now.
  if (user.role === 'INSTITUTION') redirect('/dashboard/officer')

  redirect('/')
}

