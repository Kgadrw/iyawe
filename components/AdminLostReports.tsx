'use client'

import { useEffect, useState } from 'react'
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
  description?: string | null
  lostLocation?: string | null
  lostDate?: string | null
  status?: string
  matchCount?: number
  waitingLabel: string
  createdAt?: string
}

function formatDocType(value?: string) {
  return value?.replace(/_/g, ' ') || '—'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cellOrDash(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed || '—'
}

export function AdminLostReports() {
  const { toast } = useToast()
  const [waiting, setWaiting] = useState<WaitingEntry[]>([])
  const [summary, setSummary] = useState({ lostReports: 0, watchAlerts: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.adminLostReports)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load lost documents')

      setWaiting((data.waiting || []) as WaitingEntry[])
      setSummary(
        data.summary || {
          lostReports: (data.waiting || []).filter(
            (w: WaitingEntry) => w.source === 'lost_report'
          ).length,
          watchAlerts: (data.waiting || []).filter(
            (w: WaitingEntry) => w.source === 'watch_alert'
          ).length,
          total: (data.waiting || []).length,
        }
      )
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load waiting list',
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="platform-stat-card">
          <p className="text-xs text-blue-900/60 font-medium">Total waiting</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="platform-stat-card">
          <p className="text-xs text-blue-900/60 font-medium">Lost reports</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{summary.lostReports}</p>
        </div>
        <div className="platform-stat-card">
          <p className="text-xs text-blue-900/60 font-medium">Email alerts</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{summary.watchAlerts}</p>
        </div>
      </div>

      <div className="platform-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-blue-900">
              Users waiting for their document to be listed
            </h2>
            <p className="text-xs text-blue-900/50 mt-0.5">
              People who reported a missing document or registered an email alert — still waiting
              for a match on Subizwa
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-blue-900/60">
              <tr>
                <th className="px-4 py-3 sm:px-6">Created</th>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Doc number</th>
                <th className="px-4 py-3">Lost location</th>
                <th className="px-4 py-3">Date lost</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">How registered</th>
                <th className="px-4 py-3">Waiting status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-blue-900/50" colSpan={11}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                waiting.map((r) => (
                  <tr key={`${r.source}-${r.id}`} className="hover:bg-blue-50/40 align-top">
                    <td className="px-4 py-3 sm:px-6 text-blue-900/70 whitespace-nowrap">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-blue-900">{r.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-blue-900/70 text-xs">
                      {cellOrDash(r.contactEmail)}
                    </td>
                    <td className="px-4 py-3 text-blue-900/70 text-xs whitespace-nowrap">
                      {cellOrDash(r.contactPhone)}
                    </td>
                    <td className="px-4 py-3 text-blue-900/80 whitespace-nowrap">
                      {formatDocType(r.documentType)}
                    </td>
                    <td className="px-4 py-3 text-blue-900/70 text-xs">
                      {cellOrDash(r.documentNumber)}
                    </td>
                    <td className="px-4 py-3 text-blue-900/70 text-xs max-w-[10rem]">
                      {cellOrDash(r.lostLocation)}
                    </td>
                    <td className="px-4 py-3 text-blue-900/70 whitespace-nowrap">
                      {formatDate(r.lostDate)}
                    </td>
                    <td className="px-4 py-3 text-blue-900/70 text-xs max-w-[14rem]">
                      <span className="line-clamp-3" title={r.description || undefined}>
                        {cellOrDash(r.description)}
                      </span>
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
                        {r.waitingLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              {!loading && waiting.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-blue-900/50" colSpan={11}>
                    No users are currently waiting for a lost document to be listed.
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
