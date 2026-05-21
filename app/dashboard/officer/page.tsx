'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { ReportFoundModal } from '@/components/ReportFoundModal'
import { ReportLostModal } from '@/components/ReportLostModal'
import { API_ENDPOINTS, apiRequest } from '@/lib/api'

type DocReport = {
  id: string
  documentType: string
  documentNumber?: string | null
  status?: string
  createdAt?: string
  updatedAt?: string
  foundLocation?: string | null
  lostLocation?: string | null
}

export default function OfficerDashboardPage() {
  const { toast } = useToast()
  const [lost, setLost] = useState<DocReport[]>([])
  const [found, setFound] = useState<DocReport[]>([])
  const [loading, setLoading] = useState(true)
  const [reportLostOpen, setReportLostOpen] = useState(false)
  const [reportFoundOpen, setReportFoundOpen] = useState(false)

  const summary = useMemo(() => {
    const handedOver = found.filter((f) => f.status === 'HANDED_OVER').length
    const pendingFound = found.filter((f) => !f.status || f.status === 'PENDING').length
    return { handedOver, pendingFound, lostCount: lost.length, foundCount: found.length }
  }, [lost, found])

  const refresh = async () => {
    setLoading(true)
    try {
      const [lostRes, foundRes] = await Promise.all([
        apiRequest(API_ENDPOINTS.lostReports),
        apiRequest(API_ENDPOINTS.foundReports),
      ])

      const lostData = await lostRes.json()
      const foundData = await foundRes.json()

      if (!lostRes.ok) throw new Error(lostData.error || 'Failed to load lost reports')
      if (!foundRes.ok) throw new Error(foundData.error || 'Failed to load found reports')

      setLost((lostData.reports || []) as DocReport[])
      setFound((foundData.reports || []) as DocReport[])
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Failed to load dashboard data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markFoundHandover = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/found/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'HANDED_OVER' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      toast({ title: 'Updated', description: 'Marked as handed over (found by owner).' })
      await refresh()
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload lost or found documents under your account. Mark found items handed over when the owner collects them.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReportLostOpen(true)}>
            Report Lost
          </Button>
          <Button onClick={() => setReportFoundOpen(true)}>Upload Found</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">My lost reports</div>
          <div className="mt-2 text-2xl font-semibold">{summary.lostCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">My found uploads</div>
          <div className="mt-2 text-2xl font-semibold">{summary.foundCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Pending found</div>
          <div className="mt-2 text-2xl font-semibold">{summary.pendingFound}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Handed over</div>
          <div className="mt-2 text-2xl font-semibold">{summary.handedOver}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Found uploads</h2>
          <Button variant="ghost" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {found.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{String(r.documentType).replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-700">{r.foundLocation || '-'}</td>
                  <td className="px-4 py-3">{r.status || 'PENDING'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      disabled={(r.status || 'PENDING') === 'HANDED_OVER'}
                      onClick={() => markFoundHandover(r.id)}
                    >
                      Mark handed over
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && found.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={4}>
                    No found uploads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Lost reports</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lost.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{String(r.documentType).replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-700">{r.lostLocation || '-'}</td>
                  <td className="px-4 py-3">{r.status || 'PENDING'}</td>
                </tr>
              ))}
              {!loading && lost.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={3}>
                    No lost reports yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ReportLostModal
        variant="staff"
        open={reportLostOpen}
        onOpenChange={(open) => {
          setReportLostOpen(open)
          if (!open) refresh()
        }}
      />
      <ReportFoundModal
        open={reportFoundOpen}
        onOpenChange={(open) => {
          setReportFoundOpen(open)
          if (!open) refresh()
        }}
      />
    </div>
  )
}

