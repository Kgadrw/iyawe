import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, verifyPassword } from '@/lib/auth'
import { z } from 'zod'
import { SignJWT } from 'jose'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

    const user = await getUserByEmail(data.email)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(data.password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login. Please try again.' },
      { status: 500 }
    )
  }
}

