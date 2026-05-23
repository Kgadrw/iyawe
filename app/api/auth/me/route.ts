import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { getUserFromToken } from '@/lib/middleware'
import { getUserById, getUserByEmail, hashPassword, verifyPassword } from '@/lib/auth'
import { collections } from '@/lib/mongodb'
import { STAFF_LOGIN_ROLES } from '@/lib/dashboard-routes'
import { attachAuthCookie, signAuthToken } from '@/lib/auth-token'
import { writeAuditLog } from '@/lib/audit'

const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().max(30).optional().nullable(),
    stationName: z.string().max(120).optional().nullable(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword) return !!data.currentPassword
      return true
    },
    { message: 'Current password is required to set a new password', path: ['currentPassword'] }
  )

function publicUser(user: {
  _id: ObjectId
  email: string
  name: string
  phone?: string | null
  stationName?: string | null
  role: string
  createdAt?: Date
}) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    phone: user.phone ?? '',
    stationName: user.stationName?.trim() || '',
    role: user.role,
    createdAt: user.createdAt,
  }
}

export async function GET(request: NextRequest) {
  const session = await getUserFromToken(request)
  if (!session) {
    return NextResponse.json({ user: null })
  }

  const user = await getUserById(session.userId)
  if (!user) {
    return NextResponse.json({ user: null })
  }

  const { getStaffStationContext } = await import('@/lib/station-scope')
  const stationCtx = await getStaffStationContext(session.userId)

  return NextResponse.json({
    user: {
      ...publicUser(user as any),
      stationName: stationCtx.stationName || '',
    },
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getUserFromToken(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!STAFF_LOGIN_ROLES.includes(session.role as (typeof STAFF_LOGIN_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const usersCollection = await collections.users()
    const existing = await usersCollection.findOne({ _id: new ObjectId(session.userId) })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (data.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await getUserByEmail(data.email)
      if (emailTaken && emailTaken.id !== session.userId) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
      }
    }

    const update: Record<string, unknown> = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      updatedAt: new Date(),
    }

    if (data.stationName !== undefined && ['OFFICER', 'INSTITUTION'].includes(existing.role)) {
      const trimmed = data.stationName?.trim() || null
      update.stationName = trimmed
    }

    if (data.newPassword) {
      const valid = await verifyPassword(data.currentPassword!, existing.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      update.passwordHash = await hashPassword(data.newPassword)
    }

    await usersCollection.updateOne({ _id: existing._id }, { $set: update })

    if (existing.role === 'INSTITUTION') {
      const institutionsCollection = await collections.institutions()
      const institutionUpdate: Record<string, string> = {}
      if (data.name) institutionUpdate.name = data.name.trim()
      if (data.email) institutionUpdate.email = data.email.trim().toLowerCase()
      if (data.phone !== undefined) institutionUpdate.phone = data.phone?.trim() || ''
      if (data.stationName !== undefined && data.stationName?.trim()) {
        institutionUpdate.name = data.stationName.trim()
      }
      if (Object.keys(institutionUpdate).length > 0) {
        await institutionsCollection.updateOne(
          { userId: existing._id },
          { $set: { ...institutionUpdate, updatedAt: new Date() } }
        )
      }
    }

    const updated = await usersCollection.findOne({ _id: existing._id })
    if (!updated) {
      return NextResponse.json({ error: 'Failed to load updated profile' }, { status: 500 })
    }

    await writeAuditLog({
      actorUserId: existing._id,
      actorRole: existing.role as any,
      action: 'AUTH_PROFILE_UPDATE',
      entityType: 'USER',
      entityId: existing._id,
      message: 'Profile updated',
      metadata: { emailChanged: data.email !== existing.email, passwordChanged: !!data.newPassword },
    })

    const token = await signAuthToken({
      userId: updated._id.toString(),
      email: updated.email,
      role: updated.role,
    })

    const response = NextResponse.json({
      message: 'Profile updated',
      user: publicUser(updated as any),
    })
    attachAuthCookie(response, token)
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
