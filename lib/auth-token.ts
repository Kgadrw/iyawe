import { SignJWT } from 'jose'
import { NextResponse } from 'next/server'
import { getJwtSecretKey } from '@/lib/jwt-secret'

export async function signAuthToken(payload: {
  userId: string
  email: string
  role: string
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecretKey())
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

export function attachAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, SESSION_COOKIE_OPTIONS)
}

/** Backend JWT for server-side API calls to Render (separate from the frontend session cookie). */
export function attachBackendAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('backend_token', token, SESSION_COOKIE_OPTIONS)
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of ['token', 'backend_token'] as const) {
    response.cookies.set(name, '', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
      expires: new Date(0),
    })
  }
}
