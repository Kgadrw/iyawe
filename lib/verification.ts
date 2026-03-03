import { collections } from './mongodb'
import { ObjectId } from 'mongodb'
import { ReportStatus } from './matching'
import crypto from 'crypto'

/**
 * Generate a secure verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase()
}

/**
 * Create a verification record for a match
 */
export async function createVerification(matchId: string) {
  const matchesCollection = await collections.matches()
  const match = await matchesCollection.findOne({ _id: new ObjectId(matchId) })

  if (!match) {
    throw new Error('Match not found')
  }

  // Fetch lost and found reports
  const lostCollection = await collections.lostReports()
  const foundCollection = await collections.foundReports()
  
  const lostReport = await lostCollection.findOne({ _id: match.lostReportId })
  const foundReport = await foundCollection.findOne({ _id: match.foundReportId })

  if (!lostReport || !foundReport) {
    throw new Error('Reports not found')
  }

  // Check if verification already exists
  const verificationsCollection = await collections.verifications()
  const existing = await verificationsCollection.findOne({ matchId: new ObjectId(matchId) })

  if (existing) {
    return {
      ...existing,
      id: existing._id.toString(),
    }
  }

  const verificationCode = generateVerificationCode()

  const result = await verificationsCollection.insertOne({
    matchId: new ObjectId(matchId),
    lostReportId: match.lostReportId,
    foundReportId: match.foundReportId,
    verificationCode,
    isVerified: false,
    verifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const verification = await verificationsCollection.findOne({ _id: result.insertedId })

  return {
    ...verification,
    id: verification?._id.toString(),
  }
}

/**
 * Verify ownership using the verification code
 */
export async function verifyOwnership(verificationCode: string, documentNumber: string) {
  const verificationsCollection = await collections.verifications()
  const verification = await verificationsCollection.findOne({ verificationCode })

  if (!verification) {
    return { success: false, message: 'Invalid verification code' }
  }

  if (verification.isVerified) {
    return { success: false, message: 'This verification has already been completed' }
  }

  // Fetch lost report to verify document number
  const lostCollection = await collections.lostReports()
  const lostReport = await lostCollection.findOne({ _id: verification.lostReportId })

  if (!lostReport) {
    return { success: false, message: 'Lost report not found' }
  }

  // Verify the document number matches
  const lostDocNumber = lostReport.documentNumber
  if (!lostDocNumber || lostDocNumber.toLowerCase() !== documentNumber.toLowerCase()) {
    return { success: false, message: 'Document number does not match' }
  }

  // Mark as verified
  await verificationsCollection.updateOne(
    { _id: verification._id },
    {
      $set: {
        isVerified: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )

  // Update match status
  const matchesCollection = await collections.matches()
  await matchesCollection.updateOne(
    { _id: verification.matchId },
    {
      $set: {
        status: ReportStatus.VERIFIED,
        updatedAt: new Date(),
      },
    }
  )

  // Update report statuses
  await lostCollection.updateOne(
    { _id: verification.lostReportId },
    {
      $set: {
        status: ReportStatus.VERIFIED,
        updatedAt: new Date(),
      },
    }
  )

  const foundCollection = await collections.foundReports()
  await foundCollection.updateOne(
    { _id: verification.foundReportId },
    {
      $set: {
        status: ReportStatus.VERIFIED,
        updatedAt: new Date(),
      },
    }
  )

  return {
    success: true,
    message: 'Ownership verified successfully',
    verification: {
      ...verification,
      id: verification._id.toString(),
    },
  }
}
