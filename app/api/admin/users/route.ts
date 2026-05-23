import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { createUser, getUserByEmail, UserRole } from '@/lib/auth'
import { collections } from '@/lib/mongodb'
import { requireAdminApi } from '@/lib/require-admin-api'
import { ADMIN_CREATABLE_ROLES } from '@/lib/dashboard-routes'
import { writeAuditLog } from '@/lib/audit'

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(ADMIN_CREATABLE_ROLES),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if ('error' in auth) return auth.error

  try {
    const users = await (await collections.users())
      .find({ role: { $in: ['OFFICER', 'INSTITUTION', 'ADMIN'] } })
      .sort({ createdAt: -1 })
      .toArray()

    const staff = users.map((user) => ({
      id: user._id!.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone ?? '',
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({ users: staff })
  } catch (error) {
    console.error('Error fetching staff users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const data = createStaffSchema.parse(body)

    const existingUser = await getUserByEmail(data.email)
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    const user = await createUser(
      data.email.trim().toLowerCase(),
      data.password,
      data.name.trim(),
      data.phone?.trim(),
      UserRole[data.role]
    )

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const uid = (user as { _id: ObjectId })._id

    await writeAuditLog({
      actorUserId: new ObjectId(auth.session.userId),
      actorRole: 'ADMIN',
      action: 'ADMIN_CREATE_USER',
      entityType: 'USER',
      entityId: uid,
      message: `Admin created ${data.role} account`,
      metadata: { email: user.email, role: user.role },
    })

    return NextResponse.json(
      {
        message: `${data.role} account created successfully`,
        user: {
          id: uid.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }
    console.error('Error creating staff user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
