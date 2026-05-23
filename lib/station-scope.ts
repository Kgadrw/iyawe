import { ObjectId, Filter } from 'mongodb'
import { collections } from './mongodb'

export type StaffStationContext = {
  userId: string
  role: string
  stationName: string | null
  stationKey: string | null
}

export function normalizeStationKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Load station context for an officer or institution account. */
export async function getStaffStationContext(userId: string): Promise<StaffStationContext> {
  const usersCol = await collections.users()
  const user = await usersCol.findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return { userId, role: 'USER', stationName: null, stationKey: null }
  }

  let stationName =
    typeof user.stationName === 'string' && user.stationName.trim()
      ? user.stationName.trim()
      : null

  if (!stationName && user.role === 'INSTITUTION') {
    const institution = await (await collections.institutions()).findOne({ userId: user._id })
    if (institution?.name) {
      stationName = String(institution.name).trim()
    }
  }

  return {
    userId,
    role: user.role,
    stationName,
    stationKey: stationName ? normalizeStationKey(stationName) : null,
  }
}

/** Mongo filter: documents belonging to this staff member's station. */
export function foundReportsFilterForStaff(ctx: StaffStationContext): Filter<Record<string, unknown>> {
  const own = { userId: new ObjectId(ctx.userId) }

  if (ctx.stationKey && ctx.stationName) {
    return {
      $or: [
        own,
        { stationName: { $regex: `^${escapeRegex(ctx.stationName.trim())}$`, $options: 'i' } },
      ],
    }
  }

  return own
}

/** Whether staff may manage a found report (view status, handover, etc.). */
export function staffCanManageFoundReport(
  ctx: StaffStationContext,
  report: { userId?: ObjectId | string; stationName?: string | null }
): boolean {
  if (ctx.role === 'ADMIN') return true

  const ownerId = report.userId?.toString?.() || (report.userId ? String(report.userId) : '')
  if (ownerId === ctx.userId) return true

  if (!ctx.stationKey || !report.stationName) return false
  return normalizeStationKey(report.stationName) === ctx.stationKey
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
