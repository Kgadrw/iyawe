'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS, apiRequest } from '@/lib/api'
import { cn } from '@/lib/utils'

type WaitingEntry = {
  id: string
  source: 'lost_report' | 'watch_alert'
  contactName: string
  contactEmail?: string | null
  contactPhone?: string | null
  documentType: string
  documentNumber?: string | null
  lostLocation?: string | null
  lostDate?: string | null
  status?: string
  matchCount?: number
  waitingLabel: string
  createdAt?: string
}

type Filter = 'waiting' | 'all_lost'

export function AdminLostReports() {
  const { toast } = useToast()
  const [waiting, setWaiting] = useState<WaitingEntry[]>([])
  const [allLost, setAllLost] = useState<WaitingEntry[]>([])
  const [summary, setSummary] = useState({ lostReports: 0, watchAlerts: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('waiting')

  const load = async () => {
    setLoading(true)
    try {
      const [waitingRes, lostRes] = await Promise.all([
        apiRequest(API_ENDPOINTS.adminWaiting),
        apiRequest(API_ENDPOINTS.adminLostReports),
      ])
      const waitingData = await waitingRes.json()
      const lostData = await lostRes.json()

      if (!waitingRes.ok) throw new Error(waitingData.error || 'Failed to load waiting list')
      if (!lostRes.ok) throw new Error(lostData.error || 'Failed to load lost reports')

      setWaiting((waitingData.waiting || []) as WaitingEntry[])
      setSummary(waitingData.summary || { lostReports: 0, watchAlerts: 0, total: 0 })

      const lostRows = ((lostData.reports || []) as Array<Record<string, unknown>>).map((r) => {
        const user = r.user as { name?: string; email?: string; phone?: string | null } | null
        return {
          id: String(r.id),
          source: 'lost_report' as const,
          contactName: user?.name || String(r.reporterName || 'Unknown'),
          contactEmail: user?.email || (r.reporterEmail as string | null) || null,
          contactPhone: user?.phone || (r.reporterPhone as string | null) || null,
          documentType: String(r.documentType),
          documentNumber: (r.documentNumber as string | null) ?? null,
          lostLocation: (r.lostLocation as string | null) ?? null,
          lostDate: (r.lostDate as string | null) ?? null,
          status: String(r.status || 'PENDING'),
          matchCount: 0,
          waitingLabel: String(r.status || 'PENDING'),
          createdAt: r.createdAt as string | undefined,
        }
      })
      setAllLost(lostRows)
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayed = useMemo(
    () => (filter === 'waiting' ? waiting : allLost),
    [filter, waiting, allLost]
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="platform-stat-card">
          <p className="text-xs text-blue-900/60 font-medium">Waiting for listing</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="platform-stat-card">
          <p className="text-xs text-blue-900/60 font-medium">Lost reports (pending)</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{summary.lostReports}</p>
        </div>
        <div className="platform-stat-card">
          <p className="text-xs text-blue-900/60 font-medium">Email alerts (active)</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{summary.watchAlerts}</p>
        </div>
      </div>

      <div className="platform-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-blue-900">
              {filter === 'waiting' ? 'People waiting' : 'All lost reports'}
            </h2>
            <p className="text-xs text-blue-900/50 mt-0.5">
              {filter === 'waiting'
                ? 'Citizens waiting for their missing document to be listed on Subizwa'
                : 'Every lost report submitted on the platform'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setFilter('waiting')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filter === 'waiting'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-blue-900/60 hover:text-blue-900'
                )}
              >
                Waiting
              </button>
              <button
                type="button"
                onClick={() => setFilter('all_lost')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filter === 'all_lost'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-blue-900/60 hover:text-blue-900'
                )}
              >
                All lost
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-blue-900/60">
              <tr>
                <th className="px-4 py-3 sm:px-6">Person</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Lost</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((r) => (
                <tr key={`${r.source}-${r.id}`} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3 sm:px-6">
                    <p className="font-medium text-blue-900">{r.contactName}</p>
                    {r.contactEmail ? (
                      <p className="text-xs text-blue-900/50">{r.contactEmail}</p>
                    ) : null}
                    {r.contactPhone ? (
                      <p className="text-xs text-blue-900/40">{r.contactPhone}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-blue-900/80">
                    <p className="font-medium">{String(r.documentType).replace(/_/g, ' ')}</p>
                    {r.documentNumber ? (
                      <p className="text-xs text-blue-900/50">#{r.documentNumber}</p>
                    ) : null}
                    {r.lostLocation ? (
                      <p className="text-xs text-blue-900/40">{r.lostLocation}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-blue-900/70 whitespace-nowrap">
                    {r.lostDate ? new Date(r.lostDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        r.source === 'watch_alert'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      )}
                    >
                      {r.source === 'watch_alert' ? 'Email alert' : 'Lost report'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {filter === 'waiting' ? r.waitingLabel : r.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-blue-900/70 whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {!loading && displayed.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-blue-900/50" colSpan={6}>
                    {filter === 'waiting'
                      ? 'No one is currently waiting for a document to be listed.'
                      : 'No lost reports yet.'}
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
