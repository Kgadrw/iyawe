import { Router, Request, Response } from 'express'
import { collections } from '../lib/db'

const router = Router()

// GET /api/search
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    // Create regex for case-insensitive search
    const searchRegex = new RegExp(query, 'i')

    // Search in lost reports - also search by document type
    const lostReports = await collections.lostReports()
      .find({
        $or: [
          { description: searchRegex },
          { lostLocation: searchRegex },
          { documentNumber: searchRegex },
          { documentType: searchRegex },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    // Search in found reports - also search by document type
    const foundReports = await collections.foundReports()
      .find({
        $or: [
          { description: searchRegex },
          { foundLocation: searchRegex },
          { documentNumber: searchRegex },
          { documentType: searchRegex },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    // Get user info for reports
    const lostWithUsers = await Promise.all(
      lostReports.map(async (report) => {
        let user = null
        if (report.userId) {
          user = await collections.users().findOne({ _id: report.userId as any })
        }
        return {
          ...report,
          id: report._id!.toString(),
          userId: report.userId ? report.userId.toString() : undefined,
          user: user
            ? {
                name: user.name,
                email: user.email,
                phone: user.phone,
              }
            : (report.reporterName ? { 
                name: report.reporterName, 
                email: report.reporterEmail,
                phone: report.reporterPhone 
              } : null),
          // Include all fields for details view
          lostDate: report.lostDate,
          lostLocation: report.lostLocation,
          description: report.description,
          documentNumber: report.documentNumber,
          documentType: report.documentType,
          reporterName: report.reporterName,
          reporterEmail: report.reporterEmail,
          reporterPhone: report.reporterPhone,
          status: report.status,
          createdAt: report.createdAt,
        }
      })
    )

    const foundWithUsers = await Promise.all(
      foundReports.map(async (report) => {
        let user = null
        if (report.userId) {
          user = await collections.users().findOne({ _id: report.userId as any })
        }
        return {
          ...report,
          id: report._id!.toString(),
          userId: report.userId ? report.userId.toString() : undefined,
          user: user
            ? {
                name: user.name,
                email: user.email,
                phone: user.phone,
              }
            : (report.uploaderName ? { 
                name: report.uploaderName, 
                email: report.uploaderEmail,
                phone: report.uploaderPhone 
              } : null),
          // Include all fields for details view
          foundDate: report.foundDate,
          foundLocation: report.foundLocation,
          description: report.description,
          documentNumber: report.documentNumber,
          documentType: report.documentType,
          image: report.image,
          uploaderName: report.uploaderName,
          uploaderEmail: report.uploaderEmail,
          uploaderPhone: report.uploaderPhone,
          status: report.status,
          createdAt: report.createdAt,
        }
      })
    )

    return res.json({
      query,
      results: {
        lostReports: lostWithUsers,
        foundReports: foundWithUsers,
      },
      count: lostWithUsers.length + foundWithUsers.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return res.status(500).json({ error: 'Failed to perform search' })
  }
})

export default router
