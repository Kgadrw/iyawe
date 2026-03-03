import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { findMatchesForLostReport, DocumentType } from '@/lib/matching'
import { getUserIdFromToken } from '@/lib/middleware'
import { z } from 'zod'
import { ObjectId } from 'mongodb'

const lostReportSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().optional(),
  description: z.string().optional(),
  lostDate: z.string().optional(),
  lostLocation: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = lostReportSchema.parse(body)

    const lostCollection = await collections.lostReports()
    const result = await lostCollection.insertOne({
      userId: new ObjectId(userId),
      documentType: data.documentType,
      documentNumber: data.documentNumber || null,
      description: data.description || null,
      lostDate: data.lostDate ? new Date(data.lostDate) : null,
      lostLocation: data.lostLocation || null,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const lostReport = await lostCollection.findOne({ _id: result.insertedId })

    // Try to find matches
    const matches = await findMatchesForLostReport(result.insertedId.toString())

    return NextResponse.json({
      message: 'Lost report created successfully',
      report: {
        ...lostReport,
        id: lostReport?._id.toString(),
      },
      matchesFound: matches.length,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating lost report:', error)
    return NextResponse.json(
      { error: 'Failed to create lost report' },
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

    const lostCollection = await collections.lostReports()
    const reports = await lostCollection.find({
      userId: new ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .toArray()

    // Fetch matches for each report
    const matchesCollection = await collections.matches()
    const reportsWithMatches = await Promise.all(
      reports.map(async (report) => {
        const matches = await matchesCollection.find({
          lostReportId: report._id,
        }).toArray()

        // Fetch found report details for each match
        const foundCollection = await collections.foundReports()
        const matchesWithFound = await Promise.all(
          matches.map(async (match) => {
            const foundReport = await foundCollection.findOne({ _id: match.foundReportId })
            return {
              ...match,
              id: match._id.toString(),
              foundReport: foundReport ? {
                id: foundReport._id.toString(),
                documentType: foundReport.documentType,
                foundDate: foundReport.foundDate,
                foundLocation: foundReport.foundLocation,
                status: foundReport.status,
              } : null,
            }
          })
        )

        return {
          ...report,
          id: report._id.toString(),
          matches: matchesWithFound,
        }
      })
    )

    return NextResponse.json({ reports: reportsWithMatches })
  } catch (error) {
    console.error('Error fetching lost reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lost reports' },
      { status: 500 }
    )
  }
}
