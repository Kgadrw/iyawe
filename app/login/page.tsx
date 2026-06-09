import { redirect } from 'next/navigation'
import { STAFF_LOGIN_PATH } from '@/lib/dashboard-routes'

export default function LoginPage() {
  redirect(STAFF_LOGIN_PATH)
}
