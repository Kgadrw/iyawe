import { NextRequest, NextResponse } from 'next/server'
import { createUser, UserRole } from '@/lib/auth'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import { ObjectId } from 'mongodb'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.literal('INSTITUTION').default('INSTITUTION'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if user already exists
    const { getUserByEmail } = await import('@/lib/auth')
    const existingUser = await getUserByEmail(data.email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const user = await createUser(
      data.email,
      data.password,
      data.name,
      data.phone,
      UserRole[data.role]
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user. Please try again.' },
        { status: 500 }
      )
    }

    const uid = (user as { _id: ObjectId })._id

    await writeAuditLog({
      actorUserId: uid,
      actorRole: (user.role as any) || null,
      action: 'AUTH_REGISTER',
      entityType: 'USER',
      entityId: uid,
      message: 'Institution account registered',
      metadata: { email: user.email, role: user.role },
    })

    return NextResponse.json(
      {
        message: 'Institution account created successfully',
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
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    // Handle MongoDB duplicate key error
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 11000) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    }
    
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create user. Please try again.' },
      { status: 500 }
    )
  }
}

