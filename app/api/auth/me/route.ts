import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { attachAuthCookie, signAuthToken } from '@/lib/auth-token'

const BACKEND_URL = process.env.BACKEND_URL || 'https://iyawe-backend.onrender.com'

export async function GET() {
  const user = await getCurrentUserFromCookie()
  if (!user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: user.userId,
      email: user.email,
      role: user.role,
      stationName: '',
    },
  })
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = req.cookies.get('token')?.value
    const body = await req.json()

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `token=${token}` } : {}),
      },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json()
    const res = NextResponse.json(data, { status: backendRes.status })

    if (backendRes.ok && data.user) {
      const newToken = await signAuthToken({
        userId: String(data.user.id),
        email: String(data.user.email),
        role: String(data.user.role),
      })
      attachAuthCookie(res, newToken)
    }

    return res
  } catch (error) {
    console.error('Auth /me PATCH proxy error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 502 })
  }
}
