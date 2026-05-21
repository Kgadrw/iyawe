import { redirect } from 'next/navigation'
import { getCurrentUserFromCookie } from '@/lib/server-auth'

export default async function DashboardIndex() {
  const user = await getCurrentUserFromCookie()
  if (!user) redirect('/login')

  if (user.role === 'ADMIN') redirect('/dashboard/admin')
  if (user.role === 'OFFICER') redirect('/dashboard/officer')

  // Institutions can use officer workflow for now.
  if (user.role === 'INSTITUTION') redirect('/dashboard/officer')

  redirect('/')
}

