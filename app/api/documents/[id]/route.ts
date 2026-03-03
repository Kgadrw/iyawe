import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'lost' or 'found'

    if (!type || (type !== 'lost' && type !== 'found')) {
      return NextResponse.json(
        { error: 'Document type (lost or found) is required' },
        { status: 400 }
      )
    }

    let document: any = null

    if (type === 'lost') {
      try {
        const lostCollection = await collections.lostReports()
        const lostDoc = await lostCollection.findOne({ _id: new ObjectId(id) })

        if (!lostDoc) {
          return NextResponse.json(
            { error: 'Document not found' },
            { status: 404 }
          )
        }

        // Fetch user info
        let userInfo = null
        
        // First, try to get user from users collection if userId exists
        if (lostDoc.userId) {
          try {
            const usersCollection = await collections.users()
            const user = await usersCollection.findOne({ 
              _id: typeof lostDoc.userId === 'string' ? new ObjectId(lostDoc.userId) : lostDoc.userId 
            })
            if (user) {
              userInfo = {
                name: user.name,
                email: user.email,
                phone: user.phone,
              }
            }
          } catch (userError) {
            console.log('Could not fetch user info:', userError)
          }
        }
        
        // If no user found from userId, fall back to reporter fields
        if (!userInfo && (lostDoc.reporterName || lostDoc.reporterEmail)) {
          userInfo = {
            name: lostDoc.reporterName || null,
            email: lostDoc.reporterEmail || null,
            phone: lostDoc.reporterPhone || null,
          }
        }

        document = {
          id: lostDoc._id.toString(),
          type: 'lost',
          documentType: lostDoc.documentType,
          documentNumber: lostDoc.documentNumber || null,
          description: lostDoc.description || null,
          lostLocation: lostDoc.lostLocation || null,
          foundLocation: null,
          lostDate: lostDoc.lostDate || null,
          foundDate: null,
          status: lostDoc.status || 'PENDING',
          createdAt: lostDoc.createdAt || new Date(),
          updatedAt: lostDoc.updatedAt || new Date(),
          reportDate: lostDoc.lostDate || lostDoc.createdAt || new Date(),
          image: null,
          user: userInfo,
        }
      } catch (lostError: any) {
        console.error('Error fetching lost report:', lostError)
        throw new Error(`Failed to fetch lost report: ${lostError?.message || 'Unknown error'}`)
      }
    } else {
      // For found reports
      try {
        const foundCollection = await collections.foundReports()
        const foundDoc = await foundCollection.findOne({ _id: new ObjectId(id) })

        if (!foundDoc) {
          return NextResponse.json(
            { error: 'Document not found' },
            { status: 404 }
          )
        }

        // Fetch user info
        let userInfo = null
        
        // First, try to get user from users collection if userId exists
        if (foundDoc.userId) {
          try {
            const usersCollection = await collections.users()
            const user = await usersCollection.findOne({ 
              _id: typeof foundDoc.userId === 'string' ? new ObjectId(foundDoc.userId) : foundDoc.userId 
            })
            if (user) {
              userInfo = {
                name: user.name,
                email: user.email,
                phone: user.phone,
              }
            }
          } catch (userError) {
            console.log('Could not fetch user info:', userError)
          }
        }
        
        // If no user found from userId, fall back to uploader/reporter fields
        if (!userInfo) {
          // Check for uploader fields (found reports)
          if (foundDoc.uploaderName || foundDoc.uploaderEmail) {
            userInfo = {
              name: foundDoc.uploaderName || null,
              email: foundDoc.uploaderEmail || null,
              phone: foundDoc.uploaderPhone || null,
            }
          }
          // Check for reporter fields (backup)
          else if (foundDoc.reporterName || foundDoc.reporterEmail) {
            userInfo = {
              name: foundDoc.reporterName || null,
              email: foundDoc.reporterEmail || null,
              phone: foundDoc.reporterPhone || null,
            }
          }
        }

        document = {
          id: foundDoc._id.toString(),
          type: 'found',
          documentType: foundDoc.documentType,
          documentNumber: foundDoc.documentNumber || null,
          description: foundDoc.description || null,
          lostLocation: null,
          foundLocation: foundDoc.foundLocation || null,
          lostDate: null,
          foundDate: foundDoc.foundDate || null,
          status: foundDoc.status || 'PENDING',
          createdAt: foundDoc.createdAt || new Date(),
          updatedAt: foundDoc.updatedAt || new Date(),
          reportDate: foundDoc.foundDate || foundDoc.createdAt || new Date(),
          image: foundDoc.image || null,
          user: userInfo,
        }
      } catch (foundError: any) {
        console.error('Error fetching found report:', foundError)
        throw new Error(`Failed to fetch found report: ${foundError?.message || 'Unknown error'}`)
      }
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Fetch related documents (same document type, excluding current document)
    const documentType = document.documentType
    let relatedDocuments: any[] = []

    if (documentType) {
      try {
        // Get related lost reports
        const lostCollection = await collections.lostReports()
        const relatedLostCursor = lostCollection.find({
          documentType: documentType,
          _id: { $ne: new ObjectId(id) },
        })
          .sort({ createdAt: -1 })
          .limit(6)
        
        const relatedLost = await relatedLostCursor.toArray()

        // Get related found reports
        const foundCollection = await collections.foundReports()
        const relatedFoundCursor = foundCollection.find({
          documentType: documentType,
          _id: { $ne: new ObjectId(id) },
        })
          .sort({ createdAt: -1 })
          .limit(6)
        
        const relatedFound = await relatedFoundCursor.toArray()

        // Fetch user info for related documents
        const usersCollection = await collections.users()
        
        const relatedLostWithUsers = await Promise.all(
          relatedLost.map(async (r) => {
            let user = null
            
            // Try to get user from users collection
            if (r.userId) {
              try {
                const userDoc = await usersCollection.findOne({ 
                  _id: typeof r.userId === 'string' ? new ObjectId(r.userId) : r.userId 
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
            if (!user && (r.reporterName || r.reporterEmail)) {
              user = {
                name: r.reporterName || null,
                email: r.reporterEmail || null,
              }
            }
            
            return {
              ...r,
              id: r._id.toString(),
              type: 'lost',
              reportDate: r.lostDate || r.createdAt || new Date(),
              user,
            }
          })
        )

        const relatedFoundWithUsers = await Promise.all(
          relatedFound.map(async (r) => {
            let user = null
            
            // Try to get user from users collection
            if (r.userId) {
              try {
                const userDoc = await usersCollection.findOne({ 
                  _id: typeof r.userId === 'string' ? new ObjectId(r.userId) : r.userId 
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
              if (r.uploaderName || r.uploaderEmail) {
                user = {
                  name: r.uploaderName || null,
                  email: r.uploaderEmail || null,
                }
              } else if (r.reporterName || r.reporterEmail) {
                user = {
                  name: r.reporterName || null,
                  email: r.reporterEmail || null,
                }
              }
            }
            
            return {
              ...r,
              id: r._id.toString(),
              type: 'found',
              reportDate: r.foundDate || r.createdAt || new Date(),
              user,
            }
          })
        )

        // Combine and sort by date, limit to 6 total
        relatedDocuments = [
          ...relatedLostWithUsers,
          ...relatedFoundWithUsers,
        ]
          .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
          .slice(0, 6)
      } catch (relatedError) {
        console.error('Error fetching related documents:', relatedError)
        // Continue with empty array
      }
    }

    return NextResponse.json({
      document,
      relatedDocuments,
    })
  } catch (error: any) {
    console.error('Error fetching document:', error)
    
    // Safely extract id and type for error logging
    let errorId: string | undefined
    let errorType: string | undefined
    try {
      const resolvedParams = await Promise.resolve(params)
      errorId = resolvedParams.id
      errorType = request.nextUrl.searchParams.get('type') || undefined
    } catch {
      // If we can't resolve params, that's okay - just log without them
    }
    
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      id: errorId,
      type: errorType,
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch document',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
