import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Map document type display names to enum values
const documentTypeMap: Record<string, string> = {
  'id card': 'ID_CARD',
  'id': 'ID_CARD',
  'passport': 'PASSPORT',
  'atm card': 'ATM_CARD',
  'atm': 'ATM_CARD',
  'student card': 'STUDENT_CARD',
  'student': 'STUDENT_CARD',
  "driver's license": 'DRIVERS_LICENSE',
  'drivers license': 'DRIVERS_LICENSE',
  'driver license': 'DRIVERS_LICENSE',
  'license': 'DRIVERS_LICENSE',
  'other': 'OTHER',
}

// Convert query to potential document type enum values
function getDocumentTypeFromQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim()
  const types: string[] = []
  
  // Check if query matches any document type
  for (const [key, value] of Object.entries(documentTypeMap)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      types.push(value)
    }
  }
  
  // Also check direct enum match (uppercase)
  const upperQuery = query.toUpperCase().trim()
  const enumValues = ['ID_CARD', 'PASSPORT', 'ATM_CARD', 'STUDENT_CARD', 'DRIVERS_LICENSE', 'OTHER']
  if (enumValues.includes(upperQuery)) {
    types.push(upperQuery)
  }
  
  return [...new Set(types)] // Remove duplicates
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Get potential document types from query
    const documentTypes = getDocumentTypeFromQuery(query)

    // Find users matching the name or email query (for reporter search)
    const usersCollection = await collections.users()
    const matchingUsers = await usersCollection.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).toArray()
    
    const matchingUserIds = matchingUsers.map(u => u._id.toString())

    // Build search conditions for lost reports
    const lostConditions: any[] = [
      { description: { $regex: query, $options: 'i' } },
      { lostLocation: { $regex: query, $options: 'i' } },
      { documentNumber: { $regex: query, $options: 'i' } },
    ]

    // Add user ID search if any users matched
    if (matchingUserIds.length > 0) {
      lostConditions.push({ 
        userId: { $in: matchingUserIds.map(id => new ObjectId(id)) } 
      })
    }

    // Add document type search if query matches any type
    if (documentTypes.length > 0) {
      lostConditions.push({ documentType: { $in: documentTypes } })
    }

    // Search in lost reports
    const lostCollection = await collections.lostReports()
    const lostReports = await lostCollection.find({
      $or: lostConditions,
    })
      .limit(10)
      .toArray()

    // Build search conditions for found reports
    const foundConditions: any[] = [
      { description: { $regex: query, $options: 'i' } },
      { foundLocation: { $regex: query, $options: 'i' } },
      { documentNumber: { $regex: query, $options: 'i' } },
    ]

    // Add user ID search if any users matched
    if (matchingUserIds.length > 0) {
      foundConditions.push({ 
        userId: { $in: matchingUserIds.map(id => new ObjectId(id)) } 
      })
    }

    // Add document type search if query matches any type
    if (documentTypes.length > 0) {
      foundConditions.push({ documentType: { $in: documentTypes } })
    }

    // Search in found reports
    const foundCollection = await collections.foundReports()
    const foundReports = await foundCollection.find({
      $or: foundConditions,
    })
      .limit(10)
      .toArray()

    // Fetch user info for lost reports
    const lostWithUsers = await Promise.all(
      lostReports.map(async (report) => {
        let user = null
        
        // Try to get user from users collection
        if (report.userId) {
          try {
            const userDoc = await usersCollection.findOne({ 
              _id: typeof report.userId === 'string' ? new ObjectId(report.userId) : report.userId 
            })
            if (userDoc) {
              user = {
                name: userDoc.name,
                email: userDoc.email,
              }
            }
          } catch {
            // Continue without user
          }
        }
        
        // Fall back to reporter fields
        if (!user && (report.reporterName || report.reporterEmail)) {
          user = {
            name: report.reporterName || null,
            email: report.reporterEmail || null,
          }
        }
        
        return {
          id: report._id.toString(),
          type: 'lost',
          documentType: report.documentType,
          documentNumber: report.documentNumber,
          description: report.description,
          lostLocation: report.lostLocation,
          foundLocation: null,
          status: report.status || 'PENDING',
          reportDate: report.lostDate || report.createdAt || new Date(),
          user,
        }
      })
    )

    // Fetch user info for found reports
    const foundWithUsers = await Promise.all(
      foundReports.map(async (report) => {
        let user = null
        
        // Try to get user from users collection
        if (report.userId) {
          try {
            const userDoc = await usersCollection.findOne({ 
              _id: typeof report.userId === 'string' ? new ObjectId(report.userId) : report.userId 
            })
            if (userDoc) {
              user = {
                name: userDoc.name,
                email: userDoc.email,
              }
            }
          } catch {
            // Continue without user
          }
        }
        
        // Fall back to uploader/reporter fields
        if (!user) {
          if (report.uploaderName || report.uploaderEmail) {
            user = {
              name: report.uploaderName || null,
              email: report.uploaderEmail || null,
            }
          } else if (report.reporterName || report.reporterEmail) {
            user = {
              name: report.reporterName || null,
              email: report.reporterEmail || null,
            }
          }
        }
        
        return {
          id: report._id.toString(),
          type: 'found',
          documentType: report.documentType,
          documentNumber: report.documentNumber,
          description: report.description,
          lostLocation: null,
          foundLocation: report.foundLocation,
          status: report.status || 'PENDING',
          reportDate: report.foundDate || report.createdAt || new Date(),
          image: report.image || null,
          user,
        }
      })
    )

    // Combine results
    const results = [...lostWithUsers, ...foundWithUsers]

    return NextResponse.json({
      results,
      count: results.length,
    })
  } catch (error: any) {
    console.error('Error searching documents:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search documents',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
