export const FOUND_REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'At station',
  CLAIM_PENDING: 'Claim pending',
  MATCHED: 'Matched',
  VERIFIED: 'Verified',
  HANDED_OVER: 'Collected',
}

export function foundReportStatusLabel(status?: string | null): string {
  if (!status) return FOUND_REPORT_STATUS_LABELS.PENDING
  return FOUND_REPORT_STATUS_LABELS[status] ?? status
}

export function foundReportStatusClass(status?: string | null): string {
  switch (status) {
    case 'CLAIM_PENDING':
      return 'bg-blue-100 text-blue-800'
    case 'HANDED_OVER':
      return 'bg-green-100 text-green-800'
    case 'MATCHED':
    case 'VERIFIED':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function canMarkCollected(status?: string | null): boolean {
  const s = status || 'PENDING'
  return s === 'PENDING' || s === 'CLAIM_PENDING'
}

export function canRejectClaim(status?: string | null): boolean {
  return status === 'CLAIM_PENDING'
}
