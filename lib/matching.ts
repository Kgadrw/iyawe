import { collections } from './mongodb'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'

export enum DocumentType {
  ID_CARD = 'ID_CARD',
  PASSPORT = 'PASSPORT',
  ATM_CARD = 'ATM_CARD',
  STUDENT_CARD = 'STUDENT_CARD',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  VERIFIED = 'VERIFIED',
  HANDED_OVER = 'HANDED_OVER',
  CLOSED = 'CLOSED',
}

/**
 * Hash a document number for secure comparison
 */
export function hashDocumentNumber(documentNumber: string): string {
  return crypto.createHash('sha256').update(documentNumber.toLowerCase().trim()).digest('hex')
}

/**
 * Get partial document number for display (first 2, last 2)
 */
export function getPartialDocumentNumber(documentNumber: string): string {
  if (documentNumber.length <= 4) return '****'
  return `${documentNumber.substring(0, 2)}****${documentNumber.substring(documentNumber.length - 2)}`
}

/**
 * Calculate match confidence between lost and found reports
 * Returns both confidence score and whether it's an exact document number match
 */
function calculateMatchConfidence(
  lostDocType: DocumentType,
  foundDocType: DocumentType,
  lostDocNumber: string | null,
  foundDocNumber: string | null,
  lostLocation: string | null,
  foundLocation: string | null,
  lostDate: Date | null,
  foundDate: Date
): { confidence: number; isExactMatch: boolean } {
  let confidence = 0
  let isExactMatch = false

  // Document type match (required)
  if (lostDocType !== foundDocType) {
    return { confidence: 0, isExactMatch: false }
  }
  confidence += 0.3

  // Document number match (if both provided)
  if (lostDocNumber && foundDocNumber) {
    const lostHash = hashDocumentNumber(lostDocNumber)
    const foundHash = hashDocumentNumber(foundDocNumber)
    if (lostHash === foundHash) {
      confidence += 0.5
      isExactMatch = true
    } else {
      // Partial match (first/last few characters)
      const lostPartial = lostDocNumber.substring(0, 4).toLowerCase()
      const foundPartial = foundDocNumber.substring(0, 4).toLowerCase()
      if (lostPartial === foundPartial) {
        confidence += 0.2
      }
    }
  }

  // Location match (if both provided)
  if (lostLocation && foundLocation) {
    const lostLocLower = lostLocation.toLowerCase().trim()
    const foundLocLower = foundLocation.toLowerCase().trim()
    if (lostLocLower === foundLocLower) {
      confidence += 0.1
    } else if (lostLocLower.includes(foundLocLower) || foundLocLower.includes(lostLocLower)) {
      confidence += 0.05
    }
  }

  // Date proximity (found date should be after lost date)
  if (lostDate) {
    const daysDiff = Math.floor((foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff >= 0 && daysDiff <= 30) {
      confidence += 0.1 - (daysDiff / 300) // Decreases over 30 days
    }
  }

  return { confidence: Math.min(confidence, 1.0), isExactMatch }
}

/**
 * Find and create matches for a new lost report
 */
export async function findMatchesForLostReport(lostReportId: string) {
  const lostCollection = await collections.lostReports()
  const lostReport = await lostCollection.findOne({ _id: new ObjectId(lostReportId) })

  if (!lostReport || lostReport.status !== ReportStatus.PENDING) {
    return []
  }

  // Find all pending found reports of the same document type
  const foundCollection = await collections.foundReports()
  const foundReports = await foundCollection.find({
    documentType: lostReport.documentType,
    status: ReportStatus.PENDING,
  }).toArray()

  const matches = []
  const matchesCollection = await collections.matches()

  for (const foundReport of foundReports) {
    const { confidence, isExactMatch } = calculateMatchConfidence(
      lostReport.documentType,
      foundReport.documentType,
      lostReport.documentNumber,
      foundReport.documentNumber,
      lostReport.lostLocation,
      foundReport.foundLocation,
      lostReport.lostDate,
      foundReport.foundDate
    )

    // Only create match if confidence is above threshold
    if (confidence >= 0.3) {
      const matchResult = await matchesCollection.insertOne({
        lostReportId: new ObjectId(lostReportId),
        foundReportId: foundReport._id,
        confidence,
        status: ReportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      const match = await matchesCollection.findOne({ _id: matchResult.insertedId })
      if (match) {
        matches.push({
          ...match,
          id: match._id.toString(),
        })
      }
    }
  }

  return matches
}

/**
 * Find and create matches for a new found report
 */
export async function findMatchesForFoundReport(foundReportId: string) {
  const foundCollection = await collections.foundReports()
  const foundReport = await foundCollection.findOne({ _id: new ObjectId(foundReportId) })

  if (!foundReport || foundReport.status !== ReportStatus.PENDING) {
    return []
  }

  // Find all pending lost reports of the same document type
  const lostCollection = await collections.lostReports()
  const lostReports = await lostCollection.find({
    documentType: foundReport.documentType,
    status: ReportStatus.PENDING,
  }).toArray()

  const matches = []
  const matchesCollection = await collections.matches()

  for (const lostReport of lostReports) {
    const { confidence, isExactMatch } = calculateMatchConfidence(
      lostReport.documentType,
      foundReport.documentType,
      lostReport.documentNumber,
      foundReport.documentNumber,
      lostReport.lostLocation,
      foundReport.foundLocation,
      lostReport.lostDate,
      foundReport.foundDate
    )

    // Only create match if confidence is above threshold
    if (confidence >= 0.3) {
      const matchResult = await matchesCollection.insertOne({
        lostReportId: lostReport._id,
        foundReportId: new ObjectId(foundReportId),
        confidence,
        isExactMatch,
        status: ReportStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      // Return match with exact match flag for notification purposes
      const match = await matchesCollection.findOne({ _id: matchResult.insertedId })
      if (match) {
        matches.push({
          ...match,
          id: match._id.toString(),
          isExactMatch, // Include in return value
        })
      }
    }
  }

  return matches
}
