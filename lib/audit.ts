import { ObjectId } from 'mongodb'
import { collections } from '@/lib/mongodb'

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_REGISTER'
  | 'AUTH_PROFILE_UPDATE'
  | 'REPORT_LOST_CREATE'
  | 'REPORT_FOUND_CREATE'
  | 'REPORT_STATUS_UPDATE'
  | 'NOTIFICATION_READ_UPDATE'
  | 'VERIFY_OWNERSHIP'
  | 'ADMIN_VIEW'

export type AuditEntityType =
  | 'USER'
  | 'LOST_REPORT'
  | 'FOUND_REPORT'
  | 'MATCH'
  | 'VERIFICATION'
  | 'NOTIFICATION'
  | 'SYSTEM'

export type AuditLog = {
  _id?: ObjectId
  actorUserId?: ObjectId | null
  actorRole?: 'USER' | 'INSTITUTION' | 'OFFICER' | 'ADMIN' | null
  action: AuditAction
  entityType: AuditEntityType
  entityId?: ObjectId | null
  message?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export async function writeAuditLog(entry: Omit<AuditLog, '_id' | 'createdAt'>) {
  const audit = {
    ...entry,
    createdAt: new Date(),
  } satisfies AuditLog

  await (await collections.auditLogs()).insertOne(audit)
}

