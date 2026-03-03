import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/mongodb'
import { getUserIdFromToken } from '@/lib/middleware'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await collections.users().findOne({ _id: new ObjectId(userId) })
    const isAdmin = user?.role === 'ADMIN'

    // Get notifications
    let notifications
    if (isAdmin) {
      // Admin gets both their own notifications and admin notifications
      notifications = await collections.notifications().find({
        $or: [
          { userId: new ObjectId(userId) },
          { userId: null } // Admin notifications
        ]
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
    } else {
      // Regular users only get their own notifications
      notifications = await collections.notifications().find({
        userId: new ObjectId(userId)
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
    }

    // Get unread count
    const unreadCount = await collections.notifications().countDocuments({
      userId: isAdmin ? { $in: [new ObjectId(userId), null] } : new ObjectId(userId),
      isRead: false,
    })

    const formattedNotifications = notifications.map(notif => ({
      id: notif._id.toString(),
      userId: notif.userId ? notif.userId.toString() : null,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      relatedMatchId: notif.relatedMatchId ? notif.relatedMatchId.toString() : undefined,
      relatedLostReportId: notif.relatedLostReportId ? notif.relatedLostReportId.toString() : undefined,
      relatedFoundReportId: notif.relatedFoundReportId ? notif.relatedFoundReportId.toString() : undefined,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
      updatedAt: notif.updatedAt,
    }))

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, isRead } = body

    if (!notificationId || typeof isRead !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Check if user is admin
    const user = await collections.users().findOne({ _id: new ObjectId(userId) })
    const isAdmin = user?.role === 'ADMIN'

    // Find notification and verify ownership
    const notification = await collections.notifications().findOne({
      _id: new ObjectId(notificationId)
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Verify user can update this notification
    if (!isAdmin && notification.userId?.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update notification
    await collections.notifications().updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { isRead, updatedAt: new Date() } }
    )

    return NextResponse.json({ message: 'Notification updated successfully' })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
