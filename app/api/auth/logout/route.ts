import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  cookieStore.delete('backend_token')

  return NextResponse.json({ message: 'Logged out successfully' })
}
