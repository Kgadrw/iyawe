import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { attachAuthCookie, signAuthToken } from '@/lib/auth-token'
import { fetchBackend } from '@/lib/backend-fetch'

export async function GET() {
  const user = await getCurrentUserFromCookie()
  if (!user) {
    return NextResponse.json({ user: null })
  }

  try {
    const backendRes = await fetchBackend('/api/auth/me')
    if (backendRes.ok) {
      const data = await backendRes.json()
      if (data.user) return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Auth /me GET backend error:', error)
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

    const body = await req.json()

    const backendRes = await fetchBackend('/api/auth/me', {
      method: 'PATCH',
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
