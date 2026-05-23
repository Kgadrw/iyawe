import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/middleware'

export async function requireAdminApi(request: NextRequest) {
  const session = await getUserFromToken(request)
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}
