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

    // Forward the token cookie from the backend response
    const setCookieHeader = backendRes.headers.get('set-cookie')

    const res = NextResponse.json(data, { status: backendRes.status })

    if (setCookieHeader) {
      // Parse and set the cookie explicitly
      res.headers.set('set-cookie', setCookieHeader)
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
