import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getJwtSecretKey } from '@/lib/jwt-secret'

export type JwtUser = {
  userId: string
  email: string
  role: 'USER' | 'INSTITUTION' | 'OFFICER' | 'ADMIN'
}

export async function getCurrentUserFromCookie(): Promise<JwtUser | null> {
  const token = (await cookies()).get('token')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    if (!payload.userId || !payload.email || !payload.role) return null
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: payload.role as JwtUser['role'],
    }
  } catch {
    return null
  }
}
