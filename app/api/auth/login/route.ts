import { NextRequest, NextResponse } from 'next/server'
import { attachAuthCookie, attachBackendAuthCookie, signAuthToken } from '@/lib/auth-token'

const BACKEND_URL = process.env.BACKEND_URL || 'https://iyawe-backend.onrender.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status })
    }

    if (!data.user?.id || !data.user?.email || !data.user?.role) {
      return NextResponse.json(
        { error: 'Invalid login response from server' },
        { status: 502 }
      )
    }

    // Sign the session cookie on this app so dashboard auth matches JWT_SECRET here.
    const token = await signAuthToken({
      userId: String(data.user.id),
      email: String(data.user.email),
      role: String(data.user.role),
    })

    const res = NextResponse.json({
      message: data.message || 'Login successful',
      user: data.user,
    })
    attachAuthCookie(res, token)
    if (typeof data.token === 'string' && data.token) {
      attachBackendAuthCookie(res, data.token)
    }
    return res
  } catch (error) {
    console.error('Login proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to authentication server' },
      { status: 502 }
    )
  }
}
