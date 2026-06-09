import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'https://iyawe-backend.onrender.com'

/** Fallback when NEXT_PUBLIC_API_URL is not set — may fail for large base64 ad images on Vercel. */
export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/ads`, {
      cache: 'no-store',
    })

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend ads unavailable', status: backendRes.status },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Ads proxy error:', error)
    return NextResponse.json(
      {
        error: 'Ads proxy failed — set NEXT_PUBLIC_API_URL on Vercel to fetch ads directly from the backend',
        ads: [],
        bannerTop: [],
        sidebarRight: [],
      },
      { status: 502 }
    )
  }
}
