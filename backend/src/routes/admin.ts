import { Router, Request, Response } from 'express'
import multer from 'multer'
import { collections } from '../lib/db'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { requireAdmin } from '../lib/middleware'

const router = Router()

// All admin routes require admin role
router.use(requireAdmin)

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  // Allow base64 strings to be sent as text fields
  fileFilter: (req, file, cb) => {
    // If no file is provided, that's okay (might be base64 string)
    if (!file) {
      return cb(null, true)
    }
    // Only accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Institution schema
const institutionSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['POLICE_STATION', 'BANK', 'UNIVERSITY', 'SECTOR_OFFICE', 'OTHER']),
  address: z.string().min(5),
  phone: z.string().min(10),
  email: z.string().email(),
  isActive: z.boolean().optional().default(true),
  image: z.string().optional(),
})

// GET /api/admin/institutions - Get all institutions
router.get('/institutions', async (req: Request, res: Response) => {
  try {
    const institutions = await collections.institutions()
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // Get user info for each institution
    const institutionsWithUsers = await Promise.all(
      institutions.map(async (institution) => {
        let user = null
        if (institution.userId) {
          user = await collections.users().findOne({ _id: institution.userId as any })
        }
        return {
          ...institution,
          id: institution._id!.toString(),
          userId: institution.userId ? institution.userId.toString() : undefined,
          user: user ? { name: user.name, email: user.email } : null,
        }
      })
    )

    return res.json({ institutions: institutionsWithUsers })
  } catch (error) {
    console.error('Error fetching institutions:', error)
    return res.status(500).json({ error: 'Failed to fetch institutions' })
  }
})

// POST /api/admin/institutions - Create new institution
router.post('/institutions', upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Handle both JSON and FormData
    let bodyData: any = {}
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // FormData - extract from req.body
      bodyData = {
        name: req.body.name,
        type: req.body.type,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        image: req.body.image || '',
      }
    } else {
      // JSON
      bodyData = req.body
    }

    const data = institutionSchema.parse(bodyData)
    const now = new Date()

    // Convert image to base64 if provided
    let imageBase64: string | undefined
    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    } else if (data.image) {
      imageBase64 = data.image
    }

    // Create a user account for the institution
    const { createUser } = await import('../lib/auth')
    const institutionUser = await createUser(
      data.email,
      `temp-password-${Date.now()}`, // Temporary password
      data.name,
      data.phone,
      'INSTITUTION'
    )

    // Create the institution
    const institution: any = {
      userId: institutionUser._id!,
      name: data.name,
      type: data.type,
      address: data.address,
      phone: data.phone,
      email: data.email,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }

    if (imageBase64) {
      institution.image = imageBase64
    }

    const result = await collections.institutions().insertOne(institution)
    const insertedInstitution = { ...institution, _id: result.insertedId }

    return res.status(201).json({
      message: 'Institution created successfully',
      institution: {
        ...insertedInstitution,
        id: result.insertedId.toString(),
        userId: institutionUser._id!.toString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    console.error('Error creating institution:', error)
    return res.status(500).json({ error: 'Failed to create institution' })
  }
})

// PUT /api/admin/institutions/:id - Update institution
router.put('/institutions/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Handle both JSON and FormData
    let bodyData: any = {}
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // FormData - extract from req.body
      bodyData = {
        name: req.body.name,
        type: req.body.type,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        image: req.body.image || '',
      }
    } else {
      // JSON
      bodyData = req.body
    }

    const data = institutionSchema.partial().parse(bodyData)

    const institution = await collections.institutions().findOne({
      _id: new ObjectId(id),
    })

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' })
    }

    // Convert image to base64 if provided
    let imageBase64: string | undefined
    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    } else if (data.image) {
      imageBase64 = data.image
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    }

    // Only update image if a new one is provided
    if (imageBase64) {
      updateData.image = imageBase64
    } else if (data.image === '') {
      // If image is explicitly set to empty string, remove it
      updateData.image = ''
    }

    await collections.institutions().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    // Also update the user account if email or name changed
    if (data.email || data.name) {
      const userUpdate: any = {}
      if (data.email) userUpdate.email = data.email
      if (data.name) userUpdate.name = data.name
      
      if (institution.userId) {
        await collections.users().updateOne(
          { _id: institution.userId as any },
          { $set: userUpdate }
        )
      }
    }

    const updatedInstitution = await collections.institutions().findOne({
      _id: new ObjectId(id),
    })

    return res.json({
      message: 'Institution updated successfully',
      institution: {
        ...updatedInstitution,
        id: updatedInstitution!._id!.toString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    console.error('Error updating institution:', error)
    return res.status(500).json({ error: 'Failed to update institution' })
  }
})

// DELETE /api/admin/institutions/:id - Delete institution
router.delete('/institutions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const institution = await collections.institutions().findOne({
      _id: new ObjectId(id),
    })

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' })
    }

    // Delete the institution
    await collections.institutions().deleteOne({ _id: new ObjectId(id) })

    // Optionally delete the associated user account
    if (institution.userId) {
      await collections.users().deleteOne({ _id: institution.userId as any })
    }

    return res.json({ message: 'Institution deleted successfully' })
  } catch (error) {
    console.error('Error deleting institution:', error)
    return res.status(500).json({ error: 'Failed to delete institution' })
  }
})

// GET /api/admin/users - Get all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await collections.users()
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    const usersWithoutPassword = users.map((user) => ({
      ...user,
      id: user._id!.toString(),
      _id: undefined,
      passwordHash: undefined, // Don't send password hash
    }))

    return res.json({ users: usersWithoutPassword })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await collections.users().findOne({ _id: new ObjectId(id) })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent deleting admin users
    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Cannot delete admin users' })
    }

    // Delete the user
    await collections.users().deleteOne({ _id: new ObjectId(id) })

    // If user has an institution, delete it too
    if (user.role === 'INSTITUTION') {
      await collections.institutions().deleteOne({ userId: new ObjectId(id) })
    }

    return res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({ error: 'Failed to delete user' })
  }
})

// GET /api/admin/reports/lost - Get all lost reports (admin only)
router.get('/reports/lost', async (req: Request, res: Response) => {
  try {
    const lostReports = await collections.lostReports()
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // Get user info for reports
    const reportsWithUsers = await Promise.all(
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
            ? { name: user.name, email: user.email, phone: user.phone }
            : (report.reporterName
                ? {
                    name: report.reporterName,
                    email: report.reporterEmail,
                    phone: report.reporterPhone,
                  }
                : null),
        }
      })
    )

    return res.json({ reports: reportsWithUsers })
  } catch (error) {
    console.error('Error fetching lost reports:', error)
    return res.status(500).json({ error: 'Failed to fetch lost reports' })
  }
})

// PUT /api/admin/reports/lost/:id/urgent - Update urgent status for lost report
router.put('/reports/lost/:id/urgent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { isUrgent, urgentMessage } = req.body

    if (typeof isUrgent !== 'boolean') {
      return res.status(400).json({ error: 'isUrgent must be a boolean' })
    }

    const updateData: any = {
      isUrgent,
      updatedAt: new Date()
    }

    if (urgentMessage !== undefined) {
      updateData.urgentMessage = urgentMessage || null
    }

    await collections.lostReports().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    return res.json({ message: 'Urgent status updated successfully', isUrgent, urgentMessage })
  } catch (error) {
    console.error('Error updating urgent status:', error)
    return res.status(500).json({ error: 'Failed to update urgent status' })
  }
})

// GET /api/admin/reports/found - Get all found reports (admin only)
router.get('/reports/found', async (req: Request, res: Response) => {
  try {
    const foundReports = await collections.foundReports()
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // Get user info for reports
    const reportsWithUsers = await Promise.all(
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
            ? { name: user.name, email: user.email, phone: user.phone }
            : (report.uploaderName
                ? {
                    name: report.uploaderName,
                    email: report.uploaderEmail,
                    phone: report.uploaderPhone,
                  }
                : null),
        }
      })
    )

    return res.json({ reports: reportsWithUsers })
  } catch (error) {
    console.error('Error fetching found reports:', error)
    return res.status(500).json({ error: 'Failed to fetch found reports' })
  }
})

// PUT /api/admin/reports/found/:id/urgent - Update urgent status for found report
router.put('/reports/found/:id/urgent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { isUrgent, urgentMessage } = req.body

    if (typeof isUrgent !== 'boolean') {
      return res.status(400).json({ error: 'isUrgent must be a boolean' })
    }

    const updateData: any = {
      isUrgent,
      updatedAt: new Date()
    }

    if (urgentMessage !== undefined) {
      updateData.urgentMessage = urgentMessage || null
    }

    await collections.foundReports().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    return res.json({ message: 'Urgent status updated successfully', isUrgent, urgentMessage })
  } catch (error) {
    console.error('Error updating urgent status:', error)
    return res.status(500).json({ error: 'Failed to update urgent status' })
  }
})

// PUT /api/admin/reports/lost/:id - Update lost report
router.put('/reports/lost/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { documentType, documentNumber, description, lostDate, lostLocation, reporterName, reporterEmail, reporterPhone } = req.body

    const updateData: any = {
      updatedAt: new Date()
    }

    if (documentType !== undefined) updateData.documentType = documentType
    if (documentNumber !== undefined) updateData.documentNumber = documentNumber
    if (description !== undefined) updateData.description = description
    if (lostDate !== undefined) updateData.lostDate = lostDate
    if (lostLocation !== undefined) updateData.lostLocation = lostLocation
    if (reporterName !== undefined) updateData.reporterName = reporterName
    if (reporterEmail !== undefined) updateData.reporterEmail = reporterEmail
    if (reporterPhone !== undefined) updateData.reporterPhone = reporterPhone

    const result = await collections.lostReports().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Lost report not found' })
    }

    return res.json({ message: 'Lost report updated successfully' })
  } catch (error) {
    console.error('Error updating lost report:', error)
    return res.status(500).json({ error: 'Failed to update lost report' })
  }
})

// PUT /api/admin/reports/found/:id - Update found report
router.put('/reports/found/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { documentType, documentNumber, description, foundLocation, uploaderName, uploaderEmail, uploaderPhone } = req.body

    const updateData: any = {
      updatedAt: new Date()
    }

    if (documentType !== undefined) updateData.documentType = documentType
    if (documentNumber !== undefined) updateData.documentNumber = documentNumber
    if (description !== undefined) updateData.description = description
    if (foundLocation !== undefined) updateData.foundLocation = foundLocation
    if (uploaderName !== undefined) updateData.uploaderName = uploaderName
    if (uploaderEmail !== undefined) updateData.uploaderEmail = uploaderEmail
    if (uploaderPhone !== undefined) updateData.uploaderPhone = uploaderPhone

    const result = await collections.foundReports().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Found report not found' })
    }

    return res.json({ message: 'Found report updated successfully' })
  } catch (error) {
    console.error('Error updating found report:', error)
    return res.status(500).json({ error: 'Failed to update found report' })
  }
})

// DELETE /api/admin/reports/lost/:id - Delete lost report
router.delete('/reports/lost/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const result = await collections.lostReports().deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Lost report not found' })
    }

    // Also delete associated matches
    await collections.matches().deleteMany({
      $or: [
        { lostReportId: new ObjectId(id) },
        { foundReportId: new ObjectId(id) }
      ]
    })

    return res.json({ message: 'Lost report deleted successfully' })
  } catch (error) {
    console.error('Error deleting lost report:', error)
    return res.status(500).json({ error: 'Failed to delete lost report' })
  }
})

// DELETE /api/admin/reports/found/:id - Delete found report
router.delete('/reports/found/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const result = await collections.foundReports().deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Found report not found' })
    }

    // Also delete associated matches
    await collections.matches().deleteMany({
      $or: [
        { lostReportId: new ObjectId(id) },
        { foundReportId: new ObjectId(id) }
      ]
    })

    return res.json({ message: 'Found report deleted successfully' })
  } catch (error) {
    console.error('Error deleting found report:', error)
    return res.status(500).json({ error: 'Failed to delete found report' })
  }
})

// Ads schema
const adSchema = z.object({
  image: z.string().min(1, 'Image is required'),
  link: z.string().url('Link must be a valid URL'),
  isActive: z.boolean().optional().default(true),
  order: z.number().optional().default(0),
})

// GET /api/admin/ads - Get all ads (admin only)
router.get('/ads', async (req: Request, res: Response) => {
  try {
    console.log('=== GET /api/admin/ads - Request received ===')
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    console.log('Request path:', req.path)
    console.log('Request query:', JSON.stringify(req.query))
    console.log('Request params:', JSON.stringify(req.params))
    console.log('Request body:', req.body)
    console.log('Content-Type:', req.headers['content-type'])
    
    // Test database connection first
    try {
      const adsCollection = await collections.ads()
      console.log('✅ Ads collection accessed successfully')
      
      const ads = await adsCollection
        .find({})
        .sort({ order: 1, createdAt: -1 })
        .toArray()
      
      console.log(`✅ Found ${ads.length} ads in database`)

      const adsWithId = ads.map((ad) => ({
        id: ad._id!.toString(),
        title: ad.title || '',
        description: ad.description || '',
        imageUrl: ad.image || ad.imageUrl || '',
        image: ad.image || ad.imageUrl || '',
        link: ad.link || '',
        isActive: ad.isActive !== undefined ? ad.isActive : true,
        order: ad.order || 0,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
      }))

      console.log(`✅ Returning ${adsWithId.length} ads`)
      return res.json({ ads: adsWithId })
    } catch (dbError: any) {
      console.error('❌ Database error:', dbError)
      console.error('Database error stack:', dbError.stack)
      // If collection doesn't exist, return empty array
      if (dbError.message?.includes('collection') || dbError.code === 26) {
        console.log('⚠️ Collection issue detected, returning empty array')
        return res.json({ ads: [] })
      }
      throw dbError
    }
  } catch (error: any) {
    console.error('❌ Error in GET /api/admin/ads:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ error: 'Failed to fetch ads', details: error.message })
  }
})

// POST /api/admin/ads - Create new ad (admin only)
router.post('/ads', upload.single('image'), async (req: Request, res: Response) => {
  try {
    console.log('=== POST /api/admin/ads - Request received ===')
    console.log('Content-Type:', req.headers['content-type'])
    console.log('Has file:', !!req.file)
    console.log('Request body keys:', Object.keys(req.body))
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    let bodyData: any = {}
    let imageBase64: string = ''
    
    // Handle file upload first (multer processes this into req.file)
    if (req.file) {
      console.log('File uploaded:', req.file.originalname, req.file.mimetype, req.file.size, 'bytes')
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    }
    
    // Extract form data (multer makes FormData fields available in req.body)
    const link = req.body.link || ''
    const title = req.body.title || ''
    const description = req.body.description || ''
    const isActive = req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === '1' || req.body.isActive === 1
    const order = req.body.order ? parseInt(req.body.order) : 0
    
    // Get image: from file upload if available, otherwise from body (base64 string)
    if (!imageBase64) {
      imageBase64 = req.body.image || ''
    }
    
    bodyData = {
      image: imageBase64,
      link: link,
      isActive: isActive,
      order: order,
    }

    console.log('Body data before validation:', { 
      hasImage: !!bodyData.image, 
      imageLength: bodyData.image?.length || 0,
      imagePreview: bodyData.image?.substring(0, 50) + '...',
      link: bodyData.link,
      isActive: bodyData.isActive,
      order: bodyData.order 
    })

    // Validate the data
    const data = adSchema.parse(bodyData)
    const now = new Date()

    const ad: any = {
      title: title,
      description: description,
      image: imageBase64,
      link: data.link,
      isActive: data.isActive ?? true,
      order: data.order ?? 0,
      createdAt: now,
      updatedAt: now,
    }

    console.log('Creating ad with:', { 
      title: ad.title,
      hasImage: !!ad.image, 
      imageLength: ad.image?.length || 0,
      link: ad.link 
    })

    const result = await collections.ads().insertOne(ad)
    const insertedAd = { ...ad, _id: result.insertedId }

    console.log('✅ Ad created successfully:', result.insertedId.toString())

    return res.status(201).json({
      message: 'Ad created successfully',
      ad: {
        ...insertedAd,
        id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors)
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    console.error('❌ Error creating ad:', error)
    return res.status(500).json({ error: 'Failed to create ad', details: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// PUT /api/admin/ads/:id - Update ad (admin only)
router.put('/ads/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    let bodyData: any = {}
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      bodyData = {
        image: req.body.image,
        link: req.body.link,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        order: req.body.order ? parseInt(req.body.order) : 0,
      }
    } else {
      bodyData = req.body
    }

    const data = adSchema.partial().parse(bodyData)

    const ad = await collections.ads().findOne({
      _id: new ObjectId(id),
    })

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' })
    }

    // Convert image to base64 if provided as file
    let imageBase64: string | undefined
    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    } else if (data.image) {
      imageBase64 = data.image
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    }

    if (imageBase64) {
      updateData.image = imageBase64
    }

    await collections.ads().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    const updatedAd = await collections.ads().findOne({
      _id: new ObjectId(id),
    })

    return res.json({
      message: 'Ad updated successfully',
      ad: {
        ...updatedAd,
        id: updatedAd!._id!.toString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    console.error('Error updating ad:', error)
    return res.status(500).json({ error: 'Failed to update ad' })
  }
})

// DELETE /api/admin/ads/:id - Delete ad (admin only)
router.delete('/ads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const ad = await collections.ads().findOne({
      _id: new ObjectId(id),
    })

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' })
    }

    await collections.ads().deleteOne({ _id: new ObjectId(id) })

    return res.json({ message: 'Ad deleted successfully' })
  } catch (error) {
    console.error('Error deleting ad:', error)
    return res.status(500).json({ error: 'Failed to delete ad' })
  }
})

export default router
