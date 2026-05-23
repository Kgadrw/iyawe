import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/search-documents'

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const { lostReports, foundReports, count } = await searchDocuments(query)

    return NextResponse.json({
      query,
      results: {
        lostReports,
        foundReports,
      },
      count,
    })
  } catch (error: unknown) {
    console.error('Error searching documents:', error)
    return NextResponse.json(
      {
        error: 'Failed to search documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
