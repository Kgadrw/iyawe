import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `token=${token}` } : {}),
      },
    })

    const data = await backendRes.json()
    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('Auth /me proxy error:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
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

    // Forward any updated cookie
    const setCookieHeader = backendRes.headers.get('set-cookie')
    const res = NextResponse.json(data, { status: backendRes.status })
    if (setCookieHeader) {
      res.headers.set('set-cookie', setCookieHeader)
    }

    return res
  } catch (error) {
    console.error('Auth /me PATCH proxy error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 502 })
  }
}
