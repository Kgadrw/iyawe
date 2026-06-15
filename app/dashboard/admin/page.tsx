import Link from 'next/link'
import { collections } from '@/lib/mongodb'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { writeAuditLog, type AuditLog } from '@/lib/audit'
import { ObjectId } from 'mongodb'
import {
  Users,
  FileQuestion,
  FileCheck,
  Link2,
  Bell,
  ClipboardList,
} from 'lucide-react'

const EMPTY_SUMMARY = {
  users: 0,
  lost: 0,
  found: 0,
  matches: 0,
  notifications: 0,
  auditLogs: 0,
}

async function getSummary() {
  if (!process.env.DATABASE_URL?.trim()) {
    return EMPTY_SUMMARY
  }

  try {
    const [users, lost, found, matches, notifications, auditLogs] = await Promise.all([
      (await collections.users()).countDocuments({}),
      (await collections.lostReports()).countDocuments({}),
      (await collections.foundReports()).countDocuments({}),
      (await collections.matches()).countDocuments({}),
      (await collections.notifications()).countDocuments({}),
      (await collections.auditLogs()).countDocuments({}),
    ])

    return { users, lost, found, matches, notifications, auditLogs }
  } catch {
    return EMPTY_SUMMARY
  }
}

const STAT_CARDS = [
  {
    key: 'users',
    label: 'Staff accounts',
    icon: Users,
    color: 'text-blue-600 bg-blue-50',
    href: '/dashboard/admin/staff',
  },
  {
    key: 'found',
    label: 'Found documents',
    icon: FileCheck,
    color: 'text-green-600 bg-green-50',
    href: '/dashboard/officer',
  },
  {
    key: 'lost',
    label: 'Lost & waiting',
    icon: FileQuestion,
    color: 'text-orange-600 bg-orange-50',
    href: '/dashboard/admin/lost',
  },
  {
    key: 'matches',
    label: 'Matches',
    icon: Link2,
    color: 'text-purple-600 bg-purple-50',
    href: '/dashboard/admin',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: Bell,
    color: 'text-amber-600 bg-amber-50',
    href: '/dashboard/admin',
  },
  {
    key: 'auditLogs',
    label: 'Audit logs',
    icon: ClipboardList,
    color: 'text-slate-600 bg-slate-50',
    href: '/dashboard/admin',
  },
] as const

export default async function AdminDashboardPage() {
  const user = await getCurrentUserFromCookie()
  const summary = await getSummary()

  if (user && process.env.DATABASE_URL?.trim()) {
    try {
      await writeAuditLog({
        actorUserId: new ObjectId(user.userId),
        actorRole: user.role,
        action: 'ADMIN_VIEW',
        entityType: 'SYSTEM',
        entityId: null,
        message: 'Viewed admin dashboard',
      })
    } catch {
      // Admin stats are optional when DATABASE_URL is not configured on Vercel.
    }
  }

  let recentLogs: AuditLog[] = []

  if (process.env.DATABASE_URL?.trim()) {
    try {
      recentLogs = (await (await collections.auditLogs())
        .find({})
        .sort({ createdAt: -1 })
        .limit(25)
        .toArray()) as AuditLog[]
    } catch {
      recentLogs = []
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="platform-section-title">System overview</h1>
        <p className="platform-section-desc">
          Monitor activity across Subizwa — the same platform citizens use to search and claim found documents.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, href }) => (
          <Link key={key} href={href} className="block group">
            <div className="platform-stat-card group-hover:border-blue-200 transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-blue-900/60 font-medium">{label}</p>
                  <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-blue-900 tabular-nums">
                    {summary[key]}
                  </p>
                  <p className="mt-1 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    View →
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="platform-panel">
        <div className="border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-sm sm:text-base font-semibold text-blue-900">Recent activity</h2>
          <p className="text-xs text-blue-900/50 mt-0.5">Latest audit events on the platform</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-blue-900/60">
              <tr>
                <th className="px-4 py-3 sm:px-6">Time</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3 hidden md:table-cell">Entity</th>
                <th className="px-4 py-3 hidden lg:table-cell">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLogs.map((log) => {
                const entry = log as Record<string, unknown>
                const entityId = entry.entityId
                return (
                <tr key={String(log._id)} className="hover:bg-blue-50/40 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 sm:px-6 text-blue-900/80">
                    {entry.createdAt ? new Date(entry.createdAt as Date).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-blue-900">
                      {String(entry.actorRole || '—')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-900">{String(entry.action || '—')}</td>
                  <td className="px-4 py-3 text-blue-900/70 hidden md:table-cell">
                    {String(entry.entityType || '—')}
                    {entityId ? ` · ${String(entityId).slice(-6)}` : ''}
                  </td>
                  <td className="px-4 py-3 text-blue-900/60 hidden lg:table-cell max-w-xs truncate">
                    {String(entry.message || '')}
                  </td>
                </tr>
              )})}
              {recentLogs.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-blue-900/50" colSpan={5}>
                    No audit logs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
