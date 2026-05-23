import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { collections } from '@/lib/mongodb'
import { DocumentType } from '@/lib/matching'
import { notifyWatchAgainstExistingFound } from '@/lib/document-watch'

const watchSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().optional(),
  description: z.string().optional(),
  lostDate: z.string().optional(),
  lostLocation: z.string().optional(),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = watchSchema.parse(body)

    if (!data.documentNumber?.trim() && !data.lostLocation?.trim() && !data.description?.trim()) {
      return NextResponse.json(
        {
          error:
            'Provide a document number, where you lost it, or a short description so we can match your alert.',
        },
        { status: 400 }
      )
    }

    const watchCol = await collections.documentWatchAlerts()
    const now = new Date()

    const duplicate = await watchCol.findOne({
      status: 'ACTIVE',
      contactEmail: data.contactEmail.toLowerCase(),
      documentType: data.documentType,
      ...(data.documentNumber?.trim()
        ? { documentNumber: data.documentNumber.trim() }
        : {}),
    })

    if (duplicate) {
      return NextResponse.json(
        { error: 'You already have an active alert for this document.' },
        { status: 400 }
      )
    }

    const result = await watchCol.insertOne({
      documentType: data.documentType,
      documentNumber: data.documentNumber?.trim() || null,
      description: data.description?.trim() || null,
      lostDate: data.lostDate ? new Date(data.lostDate) : null,
      lostLocation: data.lostLocation?.trim() || null,
      contactName: data.contactName,
      contactEmail: data.contactEmail.toLowerCase(),
      contactPhone: data.contactPhone?.trim() || null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    })

    const immediate = await notifyWatchAgainstExistingFound(result.insertedId.toString())

    return NextResponse.json(
      {
        message: immediate.notified
          ? 'A matching document is already listed. Check your email for details.'
          : 'Alert registered. We will email you when a matching document is listed.',
        watchId: result.insertedId.toString(),
        alreadyListed: immediate.notified,
        emailSent: immediate.notified,
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
    console.error('Error creating document watch alert:', error)
    return NextResponse.json(
      { error: 'Failed to register alert' },
      { status: 500 }
    )
  }
}
