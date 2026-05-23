import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { collections } from '@/lib/mongodb'
import { requireAdminApi } from '@/lib/require-admin-api'
import { writeAuditLog } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApi(request)
  if ('error' in auth) return auth.error

  try {
    const { id } = await context.params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const usersCol = await collections.users()
    const user = await usersCol.findOne({ _id: new ObjectId(id) })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 })
    }

    if (!['OFFICER', 'INSTITUTION'].includes(user.role)) {
      return NextResponse.json({ error: 'Only staff accounts can be removed here' }, { status: 403 })
    }

    await usersCol.deleteOne({ _id: user._id })

    if (user.role === 'INSTITUTION') {
      await (await collections.institutions()).deleteOne({ userId: user._id })
    }

    await writeAuditLog({
      actorUserId: new ObjectId(auth.session.userId),
      actorRole: 'ADMIN',
      action: 'ADMIN_DELETE_USER',
      entityType: 'USER',
      entityId: user._id,
      message: `Admin deleted ${user.role} account`,
      metadata: { email: user.email, role: user.role },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
