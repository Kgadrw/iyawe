import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/audit'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' })
  response.cookies.delete('token')
  await writeAuditLog({
    actorUserId: null,
    actorRole: null,
    action: 'AUTH_LOGOUT',
    entityType: 'SYSTEM',
    entityId: null,
    message: 'User logged out',
  })
  return response
}

