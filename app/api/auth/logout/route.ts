import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth-token'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/', req.url))
  clearAuthCookies(res)
  return res
}
