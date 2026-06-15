import { AdminLostReports } from '@/components/AdminLostReports'

export default function AdminLostReportsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="platform-section-title">Lost</h1>
        <p className="platform-section-desc">
          View everyone who registered a missing document and is waiting for it to be listed on Subizwa by an officer or station.
        </p>
      </div>
      <AdminLostReports />
    </div>
  )
}
