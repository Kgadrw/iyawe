import { ObjectId } from 'mongodb'
import { collections } from './mongodb'
import { DocumentType, hashDocumentNumber } from './matching'
import { getStationForUserId } from './station-info'
import { sendWatchFoundNotificationEmail } from './watch-alert-email'

export type DocumentWatchAlert = {
  _id?: ObjectId
  documentType: DocumentType
  documentNumber?: string | null
  description?: string | null
  lostDate?: Date | null
  lostLocation?: string | null
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  status: 'ACTIVE' | 'NOTIFIED' | 'CANCELLED'
  matchedFoundReportId?: ObjectId | null
  notifiedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

type FoundReportDoc = {
  _id: ObjectId
  userId?: ObjectId
  documentType: DocumentType
  documentNumber?: string | null
  description?: string | null
  foundLocation?: string | null
  foundDate?: Date
  status?: string
}

function normalizeText(value: string) {
  return value.toLowerCase().trim()
}

/** Returns whether an active watch alert matches a found document listing. */
export function watchAlertMatchesFound(
  watch: Pick<
    DocumentWatchAlert,
    'documentType' | 'documentNumber' | 'lostLocation' | 'description'
  >,
  found: Pick<
    FoundReportDoc,
    'documentType' | 'documentNumber' | 'foundLocation' | 'description'
  >
): { matches: boolean; isExact: boolean } {
  if (watch.documentType !== found.documentType) {
    return { matches: false, isExact: false }
  }

  if (watch.documentNumber?.trim() && found.documentNumber?.trim()) {
    const exact =
      hashDocumentNumber(watch.documentNumber) ===
      hashDocumentNumber(found.documentNumber)
    return { matches: exact, isExact: exact }
  }

  if (watch.documentNumber?.trim() && !found.documentNumber?.trim()) {
    return { matches: false, isExact: false }
  }

  let score = 0.3

  if (watch.lostLocation && found.foundLocation) {
    const w = normalizeText(watch.lostLocation)
    const f = normalizeText(found.foundLocation)
    if (w === f || w.includes(f) || f.includes(w)) score += 0.25
  }

  if (watch.description && found.description) {
    const w = normalizeText(watch.description)
    const f = normalizeText(found.description)
    if (w === f || w.includes(f) || f.includes(w)) score += 0.2
  }

  return { matches: score >= 0.45, isExact: false }
}

async function notifyOneWatch(
  watch: DocumentWatchAlert & { _id: ObjectId },
  found: FoundReportDoc
) {
  const station = found.userId
    ? await getStationForUserId(found.userId)
    : {
        name: found.foundLocation || 'Collection station',
        address: null,
        phone: null,
        email: null,
      }

  const documentTypeLabel = String(found.documentType).replace(/_/g, ' ')

  await sendWatchFoundNotificationEmail({
    to: watch.contactEmail,
    contactName: watch.contactName,
    documentTypeLabel,
    documentNumber: found.documentNumber,
    station,
    foundLocation: found.foundLocation,
  })

  const watchCol = await collections.documentWatchAlerts()
  await watchCol.updateOne(
    { _id: watch._id },
    {
      $set: {
        status: 'NOTIFIED',
        matchedFoundReportId: found._id,
        notifiedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )
}

/** Email subscribers when a new found document is registered. */
export async function notifyWatchersForFoundReport(foundReportId: string) {
  const foundCol = await collections.foundReports()
  const found = (await foundCol.findOne({
    _id: new ObjectId(foundReportId),
  })) as FoundReportDoc | null

  if (!found || found.status === 'HANDED_OVER') return { notified: 0 }

  const watchCol = await collections.documentWatchAlerts()
  const watches = (await watchCol
    .find({
      status: 'ACTIVE',
      documentType: found.documentType,
    })
    .toArray()) as (DocumentWatchAlert & { _id: ObjectId })[]

  let notified = 0
  for (const watch of watches) {
    const { matches } = watchAlertMatchesFound(watch, found)
    if (!matches) continue
    try {
      await notifyOneWatch(watch, found)
      notified += 1
    } catch (error) {
      console.error('Failed to notify watch alert', watch._id, error)
    }
  }
  return { notified }
}

/** Check existing found listings when user registers a new watch alert. */
export async function notifyWatchAgainstExistingFound(watchId: string) {
  const watchCol = await collections.documentWatchAlerts()
  const watch = (await watchCol.findOne({
    _id: new ObjectId(watchId),
    status: 'ACTIVE',
  })) as (DocumentWatchAlert & { _id: ObjectId }) | null

  if (!watch) return { notified: false }

  const foundCol = await collections.foundReports()
  const candidates = await foundCol
    .find({
      documentType: watch.documentType,
      status: { $nin: ['HANDED_OVER'] },
    })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()

  for (const found of candidates as FoundReportDoc[]) {
    const { matches } = watchAlertMatchesFound(watch, found)
    if (matches) {
      await notifyOneWatch(watch, found)
      return { notified: true, foundReportId: found._id.toString() }
    }
  }
  return { notified: false }
}
