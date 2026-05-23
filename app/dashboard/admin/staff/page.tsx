import { AdminStaffManager } from '@/components/AdminStaffManager'

export default function AdminStaffPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="platform-section-title">Staff accounts</h1>
        <p className="platform-section-desc">
          Create login credentials for police officers and institution users who register found documents.
        </p>
      </div>
      <AdminStaffManager />
    </div>
  )
}
