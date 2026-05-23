import { NextRequest, NextResponse } from 'next/server'
import { collections, getMongoConnectionHelp } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getStationForUserId } from '@/lib/station-info'

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        {
          error: 'Database not configured',
          details: getMongoConnectionHelp(),
          documents: [],
          count: 0,
        },
        { status: 503 }
      )
    }
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category')
    const filter = searchParams.get('filter')

    const foundFilter: Record<string, unknown> = {}
    if (category && category !== 'all') {
      foundFilter.documentType = category
    }
    if (filter === 'urgent') {
      foundFilter.isUrgent = true
    }
    if (filter === 'available') {
      foundFilter.$or = [{ status: 'PENDING' }, { status: { $exists: false } }]
    }
    if (filter === 'claimed') {
      foundFilter.status = { $in: ['CLAIM_PENDING', 'VERIFIED', 'MATCHED'] }
    }
    if (filter === 'collected' || filter === 'reunited') {
      foundFilter.status = 'HANDED_OVER'
    }

    const queryLimit =
      filter === 'urgent' || filter === 'claimed' || filter === 'collected' || filter === 'reunited'
        ? 1000
        : limit

    const foundCollection = await collections.foundReports()
    let foundReports = await foundCollection
      .find(foundFilter)
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .toArray()

    if (filter === 'available') {
      foundReports = foundReports.filter(
        (r) => !r.status || r.status === 'PENDING'
      )
    }

    const usersCollection = await collections.users()

    const documents = await Promise.all(
      foundReports.map(async (report) => {
        let station = null
        if (report.userId) {
          try {
            station = await getStationForUserId(report.userId)
            if (typeof report.stationName === 'string' && report.stationName.trim()) {
              station = { ...station, name: report.stationName.trim() }
            }
          } catch {
            station = null
          }
        } else if (typeof report.stationName === 'string' && report.stationName.trim()) {
          station = { name: report.stationName.trim() }
        }

        let uploader = null
        if (report.userId) {
          try {
            const user = await usersCollection.findOne({
              _id:
                typeof report.userId === 'string'
                  ? new ObjectId(report.userId)
                  : report.userId,
            })
            if (user) {
              uploader = { name: user.name, email: user.email, phone: user.phone }
            }
          } catch {
            /* skip */
          }
        }

        return {
          id: report._id.toString(),
          type: 'found' as const,
          documentType: report.documentType,
          documentNumber: report.documentNumber || null,
          description: report.description || null,
          foundLocation: report.foundLocation || null,
          lostLocation: null,
          status: report.status || 'PENDING',
          isUrgent: report.isUrgent || false,
          urgentMessage: report.urgentMessage || null,
          createdAt: report.createdAt || new Date(),
          reportDate: report.foundDate || report.createdAt || new Date(),
          image: report.image || null,
          station,
          user: uploader,
        }
      })
    )

    const sliced =
      filter === 'urgent' || filter === 'claimed' || filter === 'collected' || filter === 'reunited'
        ? documents
        : documents.slice(0, limit)

    return NextResponse.json({
      documents: sliced,
      count: sliced.length,
    })
  } catch (error: unknown) {
    console.error('Error fetching latest documents:', error)
    const details = getMongoConnectionHelp(error)
    const isConnection =
      details.includes('Cannot reach MongoDB') ||
      details.includes('DATABASE_URL') ||
      details.includes('authentication')

    return NextResponse.json(
      {
        error: 'Failed to fetch latest documents',
        details,
        documents: [],
        count: 0,
      },
      { status: isConnection ? 503 : 500 }
    )
  }
}
