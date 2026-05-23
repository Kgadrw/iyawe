import { NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { normalizeAdPlacement, type AdPlacement, type PublicAd } from '@/lib/ads'

export async function GET() {
  try {
    const adsCollection = await collections.ads()
    const ads = await adsCollection
      .find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .toArray()

    const publicAds: PublicAd[] = ads.map((ad) => ({
      id: ad._id!.toString(),
      image: ad.image,
      link: ad.link,
      title: ad.title,
      placement: normalizeAdPlacement(ad.placement),
      order: ad.order ?? 0,
    }))

    const byPlacement: Record<AdPlacement, PublicAd[]> = {
      BANNER_TOP: [],
      SIDEBAR_RIGHT: [],
    }
    for (const ad of publicAds) {
      byPlacement[ad.placement].push(ad)
    }
    byPlacement.BANNER_TOP = byPlacement.BANNER_TOP.slice(0, 2)

    return NextResponse.json({
      ads: publicAds,
      byPlacement,
      bannerTop: byPlacement.BANNER_TOP,
      sidebarRight: byPlacement.SIDEBAR_RIGHT,
    })
  } catch (error: unknown) {
    console.error('Error fetching ads:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch ads', details: message },
      { status: 500 }
    )
  }
}
