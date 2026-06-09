import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'https://iyawe-backend.onrender.com'

const emptyAds = {
  ads: [],
  byPlacement: { BANNER_TOP: [], SIDEBAR_RIGHT: [] },
  bannerTop: [],
  sidebarRight: [],
}

export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/ads`, {
      next: { revalidate: 60 },
    })

    if (backendRes.status === 404) {
      return NextResponse.json(emptyAds)
    }

    const data = await backendRes.json()
    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('Ads proxy error:', error)
    return NextResponse.json(emptyAds)
  }
}
