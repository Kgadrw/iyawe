import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json()

    const res = NextResponse.json(data, { status: backendRes.status })

    // If login was successful and we got a token, set the cookie explicitly
    if (backendRes.ok && data.token) {
      res.cookies.set('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
        path: '/',
      })
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
