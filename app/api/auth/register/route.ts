import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['USER', 'INSTITUTION']).optional(),
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
      data.role === 'INSTITUTION' ? 'INSTITUTION' : 'USER'
    )

    return NextResponse.json(
      { 
        message: 'User created successfully', 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
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

