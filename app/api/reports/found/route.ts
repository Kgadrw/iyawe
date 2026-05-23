import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { DocumentType } from '@/lib/matching'
import { getUserFromToken, getUserIdFromToken } from '@/lib/middleware'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { writeAuditLog } from '@/lib/audit'
import { getStaffStationContext, foundReportsFilterForStaff } from '@/lib/station-scope'

const foundReportSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().optional(),
  description: z.string().optional(),
  foundLocation: z.string().optional(),
  image: z.string().optional(), // Base64 image
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserFromToken(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OFFICER' && user.role !== 'INSTITUTION')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = foundReportSchema.parse(body)

    const foundCollection = await collections.foundReports()
    const result = await foundCollection.insertOne({
      userId: new ObjectId(userId),
      documentType: data.documentType,
      documentNumber: data.documentNumber || null,
      description: data.description || null,
      foundLocation: data.foundLocation || null,
      foundDate: new Date(),
      status: 'PENDING',
      image: data.image || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const foundReport = await foundCollection.findOne({ _id: result.insertedId })

    await writeAuditLog({
      actorUserId: new ObjectId(userId),
      actorRole: user.role as any,
      action: 'REPORT_FOUND_CREATE',
      entityType: 'FOUND_REPORT',
      entityId: result.insertedId as any,
      message: 'Found report created',
      metadata: { documentType: data.documentType, hasDocumentNumber: !!data.documentNumber, hasImage: !!data.image },
    })

    const { notifyWatchersForFoundReport } = await import('@/lib/document-watch')
    const { notified: watchAlertsSent } = await notifyWatchersForFoundReport(
      result.insertedId.toString()
    )

    return NextResponse.json({
      message: 'Found document registered at station successfully',
      report: {
        ...foundReport,
        id: foundReport?._id.toString(),
      },
      watchAlertsSent,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating found report:', error)
    return NextResponse.json(
      { error: 'Failed to create found report' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = await getUserFromToken(request)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stationCtx = await getStaffStationContext(userId)
    const foundCollection = await collections.foundReports()
    const reports = await foundCollection
      .find(foundReportsFilterForStaff(stationCtx))
      .sort({ createdAt: -1 })
      .toArray()

    // Fetch matches for each report
    const matchesCollection = await collections.matches()
    const reportsWithMatches = await Promise.all(
      reports.map(async (report) => {
        const matches = await matchesCollection.find({
          foundReportId: report._id,
        }).toArray()

        // Fetch lost report details for each match
        const lostCollection = await collections.lostReports()
        const matchesWithLost = await Promise.all(
          matches.map(async (match) => {
            const lostReport = await lostCollection.findOne({ _id: match.lostReportId })
            return {
              ...match,
              id: match._id.toString(),
              lostReport: lostReport ? {
                id: lostReport._id.toString(),
                documentType: lostReport.documentType,
                lostDate: lostReport.lostDate,
                lostLocation: lostReport.lostLocation,
                status: lostReport.status,
              } : null,
            }
          })
        )

        return {
          ...report,
          id: report._id.toString(),
          matches: matchesWithLost,
        }
      })
    )

    return NextResponse.json({ reports: reportsWithMatches })
  } catch (error) {
    console.error('Error fetching found reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch found reports' },
      { status: 500 }
    )
  }
}
