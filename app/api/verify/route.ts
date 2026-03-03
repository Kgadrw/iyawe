import { NextRequest, NextResponse } from 'next/server'
import { verifyOwnership } from '@/lib/verification'
import { z } from 'zod'

const verifySchema = z.object({
  verificationCode: z.string(),
  documentNumber: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = verifySchema.parse(body)

    const result = await verifyOwnership(data.verificationCode, data.documentNumber)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.message,
      verification: result.verification,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error verifying ownership:', error)
    return NextResponse.json(
      { error: 'Failed to verify ownership' },
      { status: 500 }
    )
  }
}

