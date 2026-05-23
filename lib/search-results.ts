/** Client-safe helpers for parsing `/api/search` responses (no Node/MongoDB imports). */

export type SearchApiRow = Record<string, unknown> & {
  type: string
  reportDate: unknown
  score?: number
}

export function flattenSearchResults(data: {
  results?:
    | { lostReports?: SearchApiRow[]; foundReports?: SearchApiRow[] }
    | SearchApiRow[]
}): SearchApiRow[] {
  if (!data.results) return []

  const mapRow = (r: SearchApiRow, type: string): SearchApiRow => ({
    ...r,
    type,
    reportDate: r.reportDate ?? r.lostDate ?? r.foundDate ?? r.createdAt,
  })

  if (Array.isArray(data.results)) {
    return data.results.map((r) => mapRow(r, (r.type as string) || 'lost'))
  }

  const lost = (data.results.lostReports || []).map((r) => mapRow(r, 'lost'))
  const found = (data.results.foundReports || []).map((r) => mapRow(r, 'found'))

  return [...lost, ...found].sort((a, b) => (b.score || 0) - (a.score || 0))
}
