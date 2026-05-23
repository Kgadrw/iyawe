'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { ReportFoundModal } from '@/components/ReportFoundModal'
import Link from 'next/link'
import { API_ENDPOINTS, apiRequest } from '@/lib/api'

type DocReport = {
  id: string
  documentType: string
  documentNumber?: string | null
  status?: string
  createdAt?: string
  foundLocation?: string | null
}

export default function OfficerDashboardPage() {
  const { toast } = useToast()
  const [found, setFound] = useState<DocReport[]>([])
  const [loading, setLoading] = useState(true)
  const [reportFoundOpen, setReportFoundOpen] = useState(false)
  const [stationName, setStationName] = useState('')

  const summary = useMemo(() => {
    const handedOver = found.filter((f) => f.status === 'HANDED_OVER').length
    const claimPending = found.filter((f) => f.status === 'CLAIM_PENDING').length
    const atStation = found.filter((f) => !f.status || f.status === 'PENDING').length
    return { handedOver, claimPending, atStation, foundCount: found.length }
  }, [found])

  const refresh = async () => {
    setLoading(true)
    try {
      const foundRes = await apiRequest(API_ENDPOINTS.foundReports)
      const foundData = await foundRes.json()

      if (!foundRes.ok) throw new Error(foundData.error || 'Failed to load found documents')

      setFound((foundData.reports || []) as DocReport[])
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load dashboard data',
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

      toast({ title: 'Updated', description: 'Document marked as collected by owner.' })
      await refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {stationName ? stationName : 'Station documents'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {stationName
              ? 'Documents registered at your station only. The public sees this station name when searching.'
              : 'Register found documents at your station. Set your station name in profile so the public knows where items are held.'}
          </p>
        </div>

        <Button onClick={() => setReportFoundOpen(true)}>Register found document</Button>
      </div>

      {!stationName ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add your station name in{' '}
          <Link href="/dashboard/officer/account" className="font-medium underline">
            profile
          </Link>{' '}
          (e.g. Station Muhima Downtown) so claimants know where to collect documents.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Total registered</div>
          <div className="mt-2 text-2xl font-semibold">{summary.foundCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">At station</div>
          <div className="mt-2 text-2xl font-semibold">{summary.atStation}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Claims pending</div>
          <div className="mt-2 text-2xl font-semibold">{summary.claimPending}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Collected</div>
          <div className="mt-2 text-2xl font-semibold">{summary.handedOver}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Found documents</h2>
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
                      Mark collected
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && found.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={4}>
                    No documents registered yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

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
