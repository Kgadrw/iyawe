import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const adsCollection = await collections.ads()
    const ads = await adsCollection
      .find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .toArray()

    const adsWithId = ads.map((ad) => ({
      id: ad._id!.toString(),
      image: ad.image,
      link: ad.link,
    }))

    return NextResponse.json({ ads: adsWithId })
  } catch (error: any) {
    console.error('Error fetching ads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads', details: error.message },
      { status: 500 }
    )
  }
}
