/** Server-only: use from API routes — do not import in Client Components. */
import { ObjectId } from 'mongodb'
import { collections } from './mongodb'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'ID Card',
  PASSPORT: 'Passport',
  ATM_CARD: 'ATM Card',
  STUDENT_CARD: 'Student Card',
  DRIVERS_LICENSE: "Driver's License",
  OTHER: 'Other',
}

const DOCUMENT_TYPE_ALIASES: Record<string, string[]> = {
  ID_CARD: ['id card', 'id', 'national id', 'identity'],
  PASSPORT: ['passport'],
  ATM_CARD: ['atm card', 'atm', 'bank card', 'debit'],
  STUDENT_CARD: ['student card', 'student id', 'student'],
  DRIVERS_LICENSE: ['drivers license', "driver's license", 'driver license', 'license', 'driving'],
  OTHER: ['other'],
}

export type SearchReportHit = {
  id: string
  type: 'lost' | 'found'
  documentType: string
  documentNumber: string | null
  description: string | null
  lostLocation: string | null
  foundLocation: string | null
  status: string
  reportDate: Date
  image?: string | null
  user: { name: string | null; email: string | null; phone?: string | null } | null
  score: number
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[\s\-_./]/g, '')
}

function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1)
}

function getDocumentTypesFromQuery(query: string): string[] {
  const lower = query.toLowerCase().trim()
  const tokens = tokenizeQuery(lower)
  const matched = new Set<string>()

  for (const [enumValue, aliases] of Object.entries(DOCUMENT_TYPE_ALIASES)) {
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase()
      if (
        lower === aliasNorm ||
        tokens.some((t) => t === aliasNorm || aliasNorm.includes(t) && t.length >= 3)
      ) {
        matched.add(enumValue)
      }
    }
  }

  const upper = query.toUpperCase().trim()
  if (Object.keys(DOCUMENT_TYPE_LABELS).includes(upper)) {
    matched.add(upper)
  }

  return Array.from(matched)
}

function buildFieldRegexConditions(token: string): Record<string, unknown>[] {
  const escaped = escapeRegex(token)
  const flexibleDocNum = escapeRegex(token).replace(/\s+/g, '\\s*')

  return [
    { description: { $regex: escaped, $options: 'i' } },
    { lostLocation: { $regex: escaped, $options: 'i' } },
    { foundLocation: { $regex: escaped, $options: 'i' } },
    { documentNumber: { $regex: flexibleDocNum, $options: 'i' } },
    { reporterName: { $regex: escaped, $options: 'i' } },
    { reporterEmail: { $regex: escaped, $options: 'i' } },
    { reporterPhone: { $regex: escaped, $options: 'i' } },
    { uploaderName: { $regex: escaped, $options: 'i' } },
    { uploaderEmail: { $regex: escaped, $options: 'i' } },
    { uploaderPhone: { $regex: escaped, $options: 'i' } },
    { status: { $regex: escaped, $options: 'i' } },
  ]
}

function buildMongoFilter(query: string, documentTypes: string[], matchingUserIds: ObjectId[]) {
  const tokens = tokenizeQuery(query)
  const branches: Record<string, unknown>[] = []

  if (tokens.length > 0) {
    branches.push({
      $and: tokens.map((token) => ({
        $or: buildFieldRegexConditions(token),
      })),
    })
  }

  if (documentTypes.length > 0) {
    branches.push({ documentType: { $in: documentTypes } })
  }
  if (matchingUserIds.length > 0) {
    branches.push({ userId: { $in: matchingUserIds } })
  }

  if (branches.length === 0) {
    return {}
  }
  if (branches.length === 1) {
    return branches[0]
  }
  return { $or: branches }
}

function scoreReport(
  query: string,
  report: {
    documentType?: string
    documentNumber?: string | null
    description?: string | null
    lostLocation?: string | null
    foundLocation?: string | null
    reporterName?: string | null
    reporterEmail?: string | null
    status?: string
    user?: { name?: string | null; email?: string | null } | null
  }
): number {
  const q = query.trim().toLowerCase()
  const qNorm = normalizeText(query)
  const tokens = tokenizeQuery(q)

  const fields = [
    report.documentNumber,
    report.description,
    report.lostLocation,
    report.foundLocation,
    report.reporterName,
    report.reporterEmail,
    report.user?.name,
    report.user?.email,
    report.documentType ? DOCUMENT_TYPE_LABELS[report.documentType] : null,
    report.documentType?.replace(/_/g, ' '),
    report.status,
  ].filter(Boolean) as string[]

  let score = 0

  for (const field of fields) {
    const lower = field.toLowerCase()
    const norm = normalizeText(field)

    if (lower === q || norm === qNorm) score += 100
    else if (lower.startsWith(q) || norm.startsWith(qNorm)) score += 80
    else if (lower.includes(q) || norm.includes(qNorm)) score += 50
  }

  for (const token of tokens) {
    const tNorm = normalizeText(token)
    let tokenHit = false
    for (const field of fields) {
      const lower = field.toLowerCase()
      const norm = normalizeText(field)
      if (lower === token || norm === tNorm) {
        score += 25
        tokenHit = true
      } else if (lower.includes(token) || norm.includes(tNorm)) {
        score += 12
        tokenHit = true
      }
    }
    if (!tokenHit) score -= 30
  }

  if (report.documentNumber && qNorm.length >= 4) {
    const docNorm = normalizeText(report.documentNumber)
    if (docNorm === qNorm) score += 120
    else if (docNorm.includes(qNorm)) score += 60
  }

  return score
}

async function enrichLostReports(reports: any[]) {
  const usersCollection = await collections.users()
  return Promise.all(
    reports.map(async (report) => {
      let user: SearchReportHit['user'] = null

      if (report.userId) {
        try {
          const userDoc = await usersCollection.findOne({
            _id:
              typeof report.userId === 'string'
                ? new ObjectId(report.userId)
                : report.userId,
          })
          if (userDoc) {
            user = { name: userDoc.name, email: userDoc.email, phone: userDoc.phone }
          }
        } catch {
          /* skip */
        }
      }

      if (!user && (report.reporterName || report.reporterEmail)) {
        user = {
          name: report.reporterName || null,
          email: report.reporterEmail || null,
          phone: report.reporterPhone || null,
        }
      }

      return {
        id: report._id.toString(),
        type: 'lost' as const,
        documentType: report.documentType,
        documentNumber: report.documentNumber ?? null,
        description: report.description ?? null,
        lostLocation: report.lostLocation ?? null,
        foundLocation: null,
        status: report.status || 'PENDING',
        isUrgent: Boolean(report.isUrgent),
        reportDate: report.lostDate || report.createdAt || new Date(),
        user,
        reporterName: report.reporterName,
        reporterEmail: report.reporterEmail,
      }
    })
  )
}

async function enrichFoundReports(reports: any[]) {
  const usersCollection = await collections.users()
  return Promise.all(
    reports.map(async (report) => {
      let user: SearchReportHit['user'] = null

      if (report.userId) {
        try {
          const userDoc = await usersCollection.findOne({
            _id:
              typeof report.userId === 'string'
                ? new ObjectId(report.userId)
                : report.userId,
          })
          if (userDoc) {
            user = { name: userDoc.name, email: userDoc.email, phone: userDoc.phone }
          }
        } catch {
          /* skip */
        }
      }

      if (!user && (report.uploaderName || report.uploaderEmail)) {
        user = {
          name: report.uploaderName || null,
          email: report.uploaderEmail || null,
          phone: report.uploaderPhone || null,
        }
      } else if (!user && (report.reporterName || report.reporterEmail)) {
        user = {
          name: report.reporterName || null,
          email: report.reporterEmail || null,
        }
      }

      return {
        id: report._id.toString(),
        type: 'found' as const,
        documentType: report.documentType,
        documentNumber: report.documentNumber ?? null,
        description: report.description ?? null,
        lostLocation: null,
        foundLocation: report.foundLocation ?? null,
        status: report.status || 'PENDING',
        isUrgent: Boolean(report.isUrgent),
        reportDate: report.foundDate || report.createdAt || new Date(),
        image: report.image || null,
        user,
        reporterName: report.uploaderName || report.reporterName,
        reporterEmail: report.uploaderEmail || report.reporterEmail,
      }
    })
  )
}

export async function searchDocuments(query: string, limit = 40) {
  const trimmed = query.trim()
  if (!trimmed) {
    return { lostReports: [] as SearchReportHit[], foundReports: [] as SearchReportHit[], count: 0 }
  }

  const documentTypes = getDocumentTypesFromQuery(trimmed)
  const usersCollection = await collections.users()
  const matchingUsers = await usersCollection
    .find({
      $or: [
        { name: { $regex: escapeRegex(trimmed), $options: 'i' } },
        { email: { $regex: escapeRegex(trimmed), $options: 'i' } },
      ],
    })
    .limit(20)
    .toArray()

  const matchingUserIds = matchingUsers.map((u) => u._id as ObjectId)
  const filter = buildMongoFilter(trimmed, documentTypes, matchingUserIds)

  if (Object.keys(filter).length === 0) {
    return { lostReports: [], foundReports: [], count: 0 }
  }

  const foundCollection = await collections.foundReports()

  const fetchLimit = Math.min(limit * 3, 120)

  const foundRaw = await foundCollection
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(fetchLimit)
    .toArray()

  const foundEnriched = await enrichFoundReports(foundRaw)

  const minScore = tokenizeQuery(trimmed).length > 1 ? 5 : 1

  const foundReports = foundEnriched
    .map((r) => ({ ...r, score: scoreReport(trimmed, r) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return {
    lostReports: [] as SearchReportHit[],
    foundReports,
    count: foundReports.length,
  }
}
