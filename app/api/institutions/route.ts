import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { collections } from '@/lib/mongodb'

/** GET /api/institutions — active institutions (public), aligned with backend route */
export async function GET() {
  try {
    const institutionsCol = await collections.institutions()
    const institutions = await institutionsCol
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .toArray()

    const usersCol = await collections.users()

    const institutionsWithUsers = await Promise.all(
      institutions.map(async (institution: any) => {
        let user = null
        if (institution.userId) {
          try {
            user = await usersCol.findOne({
              _id:
                typeof institution.userId === 'string'
                  ? new ObjectId(institution.userId)
                  : institution.userId,
            })
          } catch (err) {
            console.error('Error fetching user for institution:', err)
          }
        }
        return {
          ...institution,
          id: institution._id!.toString(),
          userId: institution.userId
            ? typeof institution.userId === 'object'
              ? institution.userId.toString()
              : institution.userId
            : undefined,
          user: user ? { name: user.name, email: user.email } : null,
        }
      })
    )

    return NextResponse.json({ institutions: institutionsWithUsers })
  } catch (error) {
    console.error('Error fetching institutions:', error)
    return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 })
  }
}
