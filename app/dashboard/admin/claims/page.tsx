import { AdminClaimsOverview } from '@/components/AdminClaimsOverview'

export default function AdminClaimsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="platform-section-title">Document claims</h1>
        <p className="platform-section-desc">
          See every claimed found document and who submitted each claim across all stations.
        </p>
      </div>
      <AdminClaimsOverview />
    </div>
  )
}
