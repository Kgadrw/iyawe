import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { getUserFromToken, getUserIdFromToken } from '@/lib/middleware'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

const bodySchema = z.object({
  status: z.enum(['PENDING', 'MATCHED', 'VERIFIED', 'HANDED_OVER']),
  note: z.string().optional(),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserIdFromToken(request)
    const user = await getUserFromToken(request)
    if (!userId || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['ADMIN', 'OFFICER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const data = bodySchema.parse(await request.json())

    const lostCollection = await collections.lostReports()
    const report = await lostCollection.findOne({ _id: new ObjectId(id) })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    // Officers can update only their own lost reports; admin can update all. Guest reports (no userId) are admin-only.
    if (user.role !== 'ADMIN') {
      if (!report.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const ownerId = report.userId.toString()
      if (ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await lostCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: data.status, statusNote: data.note || null, updatedAt: new Date() } }
    )

    await writeAuditLog({
      actorUserId: new ObjectId(userId),
      actorRole: user.role as any,
      action: 'REPORT_STATUS_UPDATE',
      entityType: 'LOST_REPORT',
      entityId: new ObjectId(id),
      message: `Updated lost report status to ${data.status}`,
      metadata: { note: data.note || null, previousStatus: report.status || null },
    })

    return NextResponse.json({ message: 'Status updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating lost report status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

