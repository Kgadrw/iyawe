import { NextRequest, NextResponse } from 'next/server'

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
    const res = NextResponse.json(data, { status: backendRes.status })

    if (backendRes.ok) {
      const token =
        typeof data.token === 'string'
          ? data.token
          : (() => {
              const setCookie = backendRes.headers.get('set-cookie') || ''
              const match = /token=([^;]+)/.exec(setCookie)
              return match?.[1]
            })()

      if (token) {
        res.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
      }
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
