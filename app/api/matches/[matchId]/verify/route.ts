import { NextRequest, NextResponse } from 'next/server'
import { createVerification } from '@/lib/verification'
import { getUserIdFromToken } from '@/lib/middleware'
import { collections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> | { matchId: string } }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const matchId = resolvedParams.matchId

    const matchesCollection = await collections.matches()
    const match = await matchesCollection.findOne({ _id: new ObjectId(matchId) })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Fetch lost and found reports
    const lostCollection = await collections.lostReports()
    const foundCollection = await collections.foundReports()
    
    const lostReport = await lostCollection.findOne({ _id: match.lostReportId })
    const foundReport = await foundCollection.findOne({ _id: match.foundReportId })

    if (!lostReport || !foundReport) {
      return NextResponse.json({ error: 'Reports not found' }, { status: 404 })
    }

    // Check if user owns either the lost or found report
    const lostUserId = typeof lostReport.userId === 'string' ? lostReport.userId : lostReport.userId.toString()
    const foundUserId = typeof foundReport.userId === 'string' ? foundReport.userId : foundReport.userId.toString()
    
    if (lostUserId !== userId && foundUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const verification = await createVerification(matchId)

    return NextResponse.json({
      message: 'Verification created successfully',
      verification: {
        id: verification.id,
        verificationCode: verification.verificationCode,
        matchId: verification.matchId,
      },
    })
  } catch (error) {
    console.error('Error creating verification:', error)
    return NextResponse.json(
      { error: 'Failed to create verification' },
      { status: 500 }
    )
  }
}
