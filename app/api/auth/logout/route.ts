import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth-token'

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out successfully' })
  clearAuthCookies(res)
  return res
}
