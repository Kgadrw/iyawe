import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { findMatchesForFoundReport, DocumentType } from '@/lib/matching'
import { getUserIdFromToken } from '@/lib/middleware'
import { z } from 'zod'
import { ObjectId } from 'mongodb'

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

    // Try to find matches
    const matches = await findMatchesForFoundReport(result.insertedId.toString())

    // Import notification functions
    const { createUserNotification, createAdminNotification, NotificationType } = await import('@/lib/notifications')

    // Check for exact matches and create notifications
    const exactMatches = matches.filter((m: any) => m.isExactMatch === true)
    
    if (exactMatches.length > 0) {
      // Notify admin about exact matches
      for (const match of exactMatches) {
        const lostReport = await collections.lostReports().findOne({ _id: match.lostReportId })
        const foundReportDoc = await collections.foundReports().findOne({ _id: match.foundReportId })
        
        if (lostReport && foundReportDoc) {
          const documentTypeLabel = foundReportDoc.documentType.replace(/_/g, ' ')
          const documentNumberPartial = foundReportDoc.documentNumber 
            ? `${foundReportDoc.documentNumber.substring(0, 2)}****${foundReportDoc.documentNumber.substring(foundReportDoc.documentNumber.length - 2)}`
            : 'N/A'

          // Notify admin
          await createAdminNotification(
            NotificationType.ADMIN_MATCH_ALERT,
            '🚨 Exact Document Match Found!',
            `An exact document number match has been found!\n\nDocument Type: ${documentTypeLabel}\nDocument Number: ${documentNumberPartial}\nFound Location: ${foundReportDoc.foundLocation || 'N/A'}\n\nPlease review and verify the match.`,
            match._id,
            match.lostReportId,
            match.foundReportId
          )

          // Notify user who reported the lost document
          if (lostReport.userId) {
            await createUserNotification(
              lostReport.userId,
              NotificationType.MATCH_FOUND,
              '🎉 Potential Match Found!',
              `We found a document that matches your lost ${documentTypeLabel}!\n\nDocument Number: ${documentNumberPartial}\nFound Location: ${foundReportDoc.foundLocation || 'N/A'}\n\nPlease verify if this is your document.`,
              match._id,
              match.lostReportId,
              match.foundReportId
            )
          } else if (lostReport.reporterEmail) {
            // For anonymous reports, we could send email notification here
            // For now, we'll just log it
            console.log(`Match found for anonymous lost report. Email: ${lostReport.reporterEmail}`)
          }
        }
      }
    } else if (matches.length > 0) {
      // Notify admin about potential matches (non-exact)
      await createAdminNotification(
        NotificationType.ADMIN_MATCH_ALERT,
        '⚠️ Potential Document Match Found',
        `${matches.length} potential match(es) found for the newly uploaded found document. Please review.`,
        undefined,
        undefined,
        result.insertedId
      )
    }

    return NextResponse.json({
      message: 'Found report created successfully',
      report: {
        ...foundReport,
        id: foundReport?._id.toString(),
      },
      matchesFound: matches.length,
      exactMatchesFound: exactMatches.length,
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

    const foundCollection = await collections.foundReports()
    const reports = await foundCollection.find({
      userId: new ObjectId(userId),
    })
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
