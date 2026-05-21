import { collections } from '@/lib/mongodb'
import { getCurrentUserFromCookie } from '@/lib/server-auth'
import { writeAuditLog } from '@/lib/audit'
import { ObjectId } from 'mongodb'

async function getSummary() {
  const [users, lost, found, matches, notifications, auditLogs] = await Promise.all([
    (await collections.users()).countDocuments({}),
    (await collections.lostReports()).countDocuments({}),
    (await collections.foundReports()).countDocuments({}),
    (await collections.matches()).countDocuments({}),
    (await collections.notifications()).countDocuments({}),
    (await collections.auditLogs()).countDocuments({}),
  ])

  return { users, lost, found, matches, notifications, auditLogs }
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUserFromCookie()
  const summary = await getSummary()

  if (user) {
    await writeAuditLog({
      actorUserId: new ObjectId(user.userId),
      actorRole: user.role,
      action: 'ADMIN_VIEW',
      entityType: 'SYSTEM',
      entityId: null,
      message: 'Viewed admin dashboard',
    })
  }

  const recentLogs = await (await collections.auditLogs())
    .find({})
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">System Monitoring</h1>
        <p className="mt-1 text-sm text-slate-600">Overview of activity and key data in the platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Users</div>
          <div className="mt-2 text-2xl font-semibold">{summary.users}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Lost reports</div>
          <div className="mt-2 text-2xl font-semibold">{summary.lost}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Found reports</div>
          <div className="mt-2 text-2xl font-semibold">{summary.found}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Matches</div>
          <div className="mt-2 text-2xl font-semibold">{summary.matches}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Notifications</div>
          <div className="mt-2 text-2xl font-semibold">{summary.notifications}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Audit logs</div>
          <div className="mt-2 text-2xl font-semibold">{summary.auditLogs}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentLogs.map((l: any) => (
                <tr key={l._id.toString()} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{l.actorRole || '-'}</td>
                  <td className="px-4 py-3 font-medium">{l.action}</td>
                  <td className="px-4 py-3">
                    {l.entityType}
                    {l.entityId ? `:${String(l.entityId)}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{l.message || ''}</td>
                </tr>
              ))}
              {recentLogs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={5}>
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

