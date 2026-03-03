import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { DocumentType } from '@/lib/matching'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Convert image to base64 for AI processing
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Simulated AI processing
    const extractedText = await simulateAIImageProcessing(base64Image)
    
    // Search for matching documents based on extracted text
    const matches = await searchDocumentsByText(extractedText)

    return NextResponse.json({
      message: 'Image search completed',
      extractedText,
      matches,
      count: matches.lostReports.length + matches.foundReports.length,
    })
  } catch (error) {
    console.error('Image search error:', error)
    return NextResponse.json(
      { error: 'Failed to process image search' },
      { status: 500 }
    )
  }
}

// Simulate AI image processing
async function simulateAIImageProcessing(base64Image: string): Promise<string> {
  // Placeholder - replace with actual AI service
  return 'ID_CARD 123456789'
}

// Search documents based on extracted text
async function searchDocumentsByText(extractedText: string) {
  try {
    // Parse extracted text to find document type and number
    const documentTypeMatch = extractedText.match(/(ID_CARD|PASSPORT|ATM_CARD|STUDENT_CARD|DRIVERS_LICENSE)/i)
    const numberMatch = extractedText.match(/\d+/)
    
    const documentType = documentTypeMatch ? documentTypeMatch[0].toUpperCase() as DocumentType : null
    const documentNumber = numberMatch ? numberMatch[0] : null

    // Build search filter
    const filter: any = { status: 'PENDING' }
    if (documentType) {
      filter.documentType = documentType
    }
    if (documentNumber) {
      filter.documentNumber = { $regex: documentNumber, $options: 'i' }
    }

    // Search in lost reports
    const lostCollection = await collections.lostReports()
    const lostReports = await lostCollection.find(filter)
      .limit(10)
      .toArray()

    // Search in found reports
    const foundCollection = await collections.foundReports()
    const foundReports = await foundCollection.find(filter)
      .limit(10)
      .toArray()

    // Fetch user info
    const usersCollection = await collections.users()
    
    const lostWithUsers = await Promise.all(
      lostReports.map(async (report) => {
        let user = null
        if (report.userId) {
          try {
            const userDoc = await usersCollection.findOne({ 
              _id: typeof report.userId === 'string' ? new ObjectId(report.userId) : report.userId 
            })
            user = userDoc ? {
              name: userDoc.name,
              email: userDoc.email,
            } : null
          } catch {
            // Continue without user
          }
        }
        return {
          ...report,
          id: report._id.toString(),
          user,
        }
      })
    )

    const foundWithUsers = await Promise.all(
      foundReports.map(async (report) => {
        let user = null
        if (report.userId) {
          try {
            const userDoc = await usersCollection.findOne({ 
              _id: typeof report.userId === 'string' ? new ObjectId(report.userId) : report.userId 
            })
            user = userDoc ? {
              name: userDoc.name,
              email: userDoc.email,
            } : null
          } catch {
            // Continue without user
          }
        }
        return {
          ...report,
          id: report._id.toString(),
          user,
        }
      })
    )

    return {
      lostReports: lostWithUsers,
      foundReports: foundWithUsers,
    }
  } catch (error) {
    console.error('Document search error:', error)
    return {
      lostReports: [],
      foundReports: [],
    }
  }
}
