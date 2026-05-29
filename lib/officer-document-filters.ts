export type OfficerDocFilter = 'all' | 'at_station' | 'claim_pending' | 'collected'

export function parseOfficerDocFilter(value: string | null | undefined): OfficerDocFilter {
  if (value === 'at_station' || value === 'claim_pending' || value === 'collected') return value
  return 'all'
}

export function filterOfficerDocuments<T extends { status?: string | null }>(
  docs: T[],
  filter: OfficerDocFilter
): T[] {
  switch (filter) {
    case 'at_station':
      return docs.filter((d) => !d.status || d.status === 'PENDING')
    case 'claim_pending':
      return docs.filter((d) => d.status === 'CLAIM_PENDING')
    case 'collected':
      return docs.filter((d) => d.status === 'HANDED_OVER')
    default:
      return docs
  }
}

export const OFFICER_FILTER_LABELS: Record<OfficerDocFilter, string> = {
  all: 'All documents',
  at_station: 'At station',
  claim_pending: 'Claims pending',
  collected: 'Collected',
}
