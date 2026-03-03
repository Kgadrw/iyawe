import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')

export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, secret)
    return payload.userId as string
  } catch (error) {
    return null
  }
}

export async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, secret)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch (error) {
    return null
  }
}

