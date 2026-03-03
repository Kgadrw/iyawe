import { Router, Request, Response } from 'express'
import { createUser, getUserByEmail, verifyPassword } from '../lib/auth'
import { z } from 'zod'
import { SignJWT } from 'jose'

const router = Router()

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['USER', 'INSTITUTION']).optional(),
})

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await getUserByEmail(data.email)
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    const user = await createUser(
      data.email,
      data.password,
      data.name,
      data.phone,
      data.role === 'INSTITUTION' ? 'INSTITUTION' : 'USER'
    )

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }

    // Handle MongoDB duplicate key error
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 11000) {
        return res.status(400).json({ error: 'User with this email already exists' })
      }
    }

    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Failed to create user. Please try again.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body)

    const user = await getUserByEmail(data.email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isValid = await verifyPassword(data.password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Create JWT token
    const token = await new SignJWT({
      userId: user._id!.toString(),
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days in milliseconds
      path: '/',
    })

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Failed to login. Please try again.' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' })
  return res.json({ message: 'Logged out successfully' })
})

export default router
