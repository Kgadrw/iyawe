import { AdminLostReports } from '@/components/AdminLostReports'

export default function AdminLostReportsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="platform-section-title">Lost & waiting</h1>
        <p className="platform-section-desc">
          See everyone who reported a missing document or registered an email alert, and is still waiting for it to appear on Subizwa.
        </p>
      </div>
      <AdminLostReports />
    </div>
  )
}
