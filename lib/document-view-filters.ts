export type DocumentViewType = 'all' | 'available' | 'claimed' | 'collected' | 'urgent'

const CLAIMED_STATUSES = new Set(['CLAIM_PENDING', 'VERIFIED', 'MATCHED'])

export type DocumentListItem = {
  type?: string
  status?: string
  isUrgent?: boolean
  documentType?: string
}

export function applyDocumentViewFilter<T extends DocumentListItem>(
  documents: T[],
  viewType: DocumentViewType
): T[] {
  switch (viewType) {
    case 'all':
      return documents
    case 'available':
      return documents.filter(
        (doc) => !doc.status || doc.status === 'PENDING'
      )
    case 'claimed':
      return documents.filter(
        (doc) => doc.status != null && CLAIMED_STATUSES.has(doc.status)
      )
    case 'collected':
      return documents.filter((doc) => doc.status === 'HANDED_OVER')
    case 'urgent':
      return documents.filter((doc) => doc.isUrgent === true)
    default:
      return documents
  }
}

export function applyCategoryFilter<T extends DocumentListItem>(
  documents: T[],
  category: string
): T[] {
  if (!category || category === 'all') return documents
  return documents.filter((doc) => doc.documentType === category)
}

export function getDocumentViewCounts(documents: DocumentListItem[]) {
  return {
    all: documents.length,
    available: documents.filter((d) => !d.status || d.status === 'PENDING').length,
    claimed: documents.filter(
      (d) => d.status != null && CLAIMED_STATUSES.has(d.status)
    ).length,
    collected: documents.filter((d) => d.status === 'HANDED_OVER').length,
    urgent: documents.filter((d) => d.isUrgent === true).length,
  }
}

export function getEmptyFilterMessage(viewType: DocumentViewType): string {
  switch (viewType) {
    case 'available':
      return 'No documents waiting at stations'
    case 'claimed':
      return 'No pending claims'
    case 'collected':
      return 'No collected documents yet'
    case 'urgent':
      return 'No urgent documents'
    default:
      return 'No documents found'
  }
}
