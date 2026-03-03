import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // 'all', 'lost', or 'found'
    const category = searchParams.get('category') // Document type filter
    const filter = searchParams.get('filter') // 'urgent', 'reunited', 'nearby'

    // Test MongoDB connection first
    try {
      await collections.lostReports()
    } catch (connectionError: any) {
      console.error('MongoDB connection error:', connectionError)
      if (connectionError?.message?.includes('ENOTFOUND') || 
          connectionError?.message?.includes('querySrv') || 
          connectionError?.code === 'ENOTFOUND') {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: 'Unable to connect to MongoDB. Please check your DATABASE_URL environment variable and ensure your MongoDB cluster is running.',
            documents: [],
            count: 0
          },
          { status: 503 } // Service Unavailable
        )
      }
      throw connectionError
    }

    // Build filter conditions for lost reports
    const lostFilter: any = {}
    if (category && category !== 'all') {
      lostFilter.documentType = category
    }
    // Add urgent filter if requested
    if (filter === 'urgent') {
      lostFilter.isUrgent = true
    }
    // Add reunited filter if requested
    if (filter === 'reunited') {
      lostFilter.status = { $in: ['MATCHED', 'VERIFIED', 'HANDED_OVER'] }
    }

    // Build filter conditions for found reports
    const foundFilter: any = {}
    if (category && category !== 'all') {
      foundFilter.documentType = category
    }
    // Add urgent filter if requested
    if (filter === 'urgent') {
      foundFilter.isUrgent = true
    }
    // Add reunited filter if requested
    if (filter === 'reunited') {
      foundFilter.status = { $in: ['MATCHED', 'VERIFIED', 'HANDED_OVER'] }
    }
    // Add nearby filter if requested (documents with location)
    if (filter === 'nearby') {
      lostFilter.lostLocation = { $exists: true, $ne: null, $ne: '' }
      foundFilter.foundLocation = { $exists: true, $ne: null, $ne: '' }
    }

    // Fetch lost reports
    let lostReports: any[] = []
    if (!type || type === 'all' || type === 'lost') {
      try {
        const lostCollection = await collections.lostReports()
        // For urgent/reunited/nearby filters, fetch all matching documents (up to 1000)
        const queryLimit = (filter === 'urgent' || filter === 'reunited' || filter === 'nearby') ? 1000 : (type === 'lost' ? limit : Math.ceil(limit / 2))
        const lostCursor = lostCollection
          .find(lostFilter)
          .sort({ createdAt: -1 })
          .limit(queryLimit)
        
        lostReports = await lostCursor.toArray()

        // Fetch user information for each lost report
        const usersCollection = await collections.users()
        for (const report of lostReports) {
          let userInfo = null
          
          // First, try to get user from users collection if userId exists
          if (report.userId) {
            try {
              const user = await usersCollection.findOne({ 
                _id: typeof report.userId === 'string' ? new ObjectId(report.userId) : report.userId 
              })
              if (user) {
                userInfo = {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                }
              }
            } catch (userError) {
              console.log('Could not fetch user for lost report:', report._id)
            }
          }
          
          // If no user found from userId, fall back to reporter fields
          if (!userInfo && (report.reporterName || report.reporterEmail)) {
            userInfo = {
              name: report.reporterName || null,
              email: report.reporterEmail || null,
              phone: report.reporterPhone || null,
            }
          }
          
          report.user = userInfo
        }
      } catch (error: any) {
        console.error('Error fetching lost reports:', error)
        // If it's a connection error, throw it so we can return proper error response
        if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('querySrv') || error?.code === 'ENOTFOUND') {
          throw new Error('MongoDB connection failed. Please check your DATABASE_URL environment variable.')
        }
        // Continue with empty array for other errors
      }
    }

    // Fetch found reports
    let foundReports: any[] = []
    if (!type || type === 'all' || type === 'found') {
      try {
        const foundCollection = await collections.foundReports()
        // For urgent/reunited/nearby filters, fetch all matching documents (up to 1000)
        const queryLimit = (filter === 'urgent' || filter === 'reunited' || filter === 'nearby') ? 1000 : (type === 'found' ? limit : Math.ceil(limit / 2))
        const foundCursor = foundCollection
          .find(foundFilter)
          .sort({ createdAt: -1 })
          .limit(queryLimit)
        
        foundReports = await foundCursor.toArray()

        // Fetch user information for each found report
        const usersCollection = await collections.users()
        for (const report of foundReports) {
          let userInfo = null
          
          // First, try to get user from users collection if userId exists
          if (report.userId) {
            try {
              const user = await usersCollection.findOne({ 
                _id: typeof report.userId === 'string' ? new ObjectId(report.userId) : report.userId 
              })
              if (user) {
                userInfo = {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                }
              }
            } catch (userError) {
              console.log('Could not fetch user for found report:', report._id)
            }
          }
          
          // If no user found from userId, fall back to uploader/reporter fields
          if (!userInfo) {
            // Check for uploader fields (found reports)
            if (report.uploaderName || report.uploaderEmail) {
              userInfo = {
                name: report.uploaderName || null,
                email: report.uploaderEmail || null,
                phone: report.uploaderPhone || null,
              }
            }
            // Check for reporter fields (backup)
            else if (report.reporterName || report.reporterEmail) {
              userInfo = {
                name: report.reporterName || null,
                email: report.reporterEmail || null,
                phone: report.reporterPhone || null,
              }
            }
          }
          
          report.user = userInfo
        }
      } catch (error: any) {
        console.error('Error fetching found reports:', error)
        // If it's a connection error, throw it so we can return proper error response
        if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('querySrv') || error?.code === 'ENOTFOUND') {
          throw new Error('MongoDB connection failed. Please check your DATABASE_URL environment variable.')
        }
        // Continue with empty array for other errors
      }
    }

    // Transform lost reports
    const transformedLost = lostReports.map(report => ({
      id: report._id.toString(),
      type: 'lost' as const,
      documentType: report.documentType,
      documentNumber: report.documentNumber || null,
      description: report.description || null,
      lostLocation: report.lostLocation || null,
      foundLocation: null,
      lostDate: report.lostDate || null,
      foundDate: null,
      status: report.status || 'PENDING',
      isUrgent: report.isUrgent || false,
      urgentMessage: report.urgentMessage || null,
      createdAt: report.createdAt || new Date(),
      updatedAt: report.updatedAt || new Date(),
      reportDate: report.lostDate || report.createdAt || new Date(),
      image: null, // Lost reports don't have images
      user: report.user || null,
    }))

    // Transform found reports
    const transformedFound = foundReports.map(report => ({
      id: report._id.toString(),
      type: 'found' as const,
      documentType: report.documentType,
      documentNumber: report.documentNumber || null,
      description: report.description || null,
      lostLocation: null,
      foundLocation: report.foundLocation || null,
      lostDate: null,
      foundDate: report.foundDate || null,
      status: report.status || 'PENDING',
      isUrgent: report.isUrgent || false,
      urgentMessage: report.urgentMessage || null,
      createdAt: report.createdAt || new Date(),
      updatedAt: report.updatedAt || new Date(),
      reportDate: report.foundDate || report.createdAt || new Date(),
      image: report.image || null,
      user: report.user || null,
    }))

    // Combine and sort by date
    let allDocuments = [
      ...transformedLost,
      ...transformedFound,
    ]
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    
    // For nearby filter, apply location filter on combined results (for lost reports)
    if (filter === 'nearby') {
      allDocuments = allDocuments.filter(doc => 
        (doc.lostLocation && doc.lostLocation.trim() !== '') || 
        (doc.foundLocation && doc.foundLocation.trim() !== '')
      )
    }
    
    // Only slice if not using special filters
    if (filter !== 'urgent' && filter !== 'reunited' && filter !== 'nearby') {
      allDocuments = allDocuments.slice(0, limit)
    }

    return NextResponse.json({
      documents: allDocuments,
      count: allDocuments.length,
    })
  } catch (error: any) {
    console.error('Error fetching latest documents:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch latest documents',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
