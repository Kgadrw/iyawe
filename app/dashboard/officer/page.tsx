'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { ReportFoundModal } from '@/components/ReportFoundModal'
import { OfficerDocumentModal, type OfficerDoc } from '@/components/OfficerDocumentModal'
import { API_ENDPOINTS, apiRequest } from '@/lib/api'
import {
  filterOfficerDocuments,
  OFFICER_FILTER_LABELS,
  parseOfficerDocFilter,
  type OfficerDocFilter,
} from '@/lib/officer-document-filters'
import { cn } from '@/lib/utils'
import { foundReportStatusClass, foundReportStatusLabel } from '@/lib/officer-report-status'
import { FileStack, Package, Clock, CheckCircle2, Plus, Users } from 'lucide-react'

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  active,
}: {
  label: string
  value: number
  href: string
  icon: typeof FileStack
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group rounded-lg border bg-white p-4 transition-all hover:shadow-md hover:border-blue-200',
        active && 'ring-2 ring-blue-900/20 border-blue-300 bg-blue-50/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
            View list →
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            active ? 'bg-blue-900 text-gold-400' : 'bg-slate-100 text-slate-600'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}

function OfficerDashboardContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const filter = parseOfficerDocFilter(searchParams.get('filter'))

  const [found, setFound] = useState<OfficerDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [reportFoundOpen, setReportFoundOpen] = useState(false)
  const [manageDoc, setManageDoc] = useState<OfficerDoc | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [stationName, setStationName] = useState('')

  const summary = useMemo(() => {
    const handedOver = found.filter((f) => f.status === 'HANDED_OVER').length
    const claimPending = found.filter((f) => f.status === 'CLAIM_PENDING').length
    const atStation = found.filter((f) => !f.status || f.status === 'PENDING').length
    return { handedOver, claimPending, atStation, foundCount: found.length }
  }, [found])

  const displayed = useMemo(() => filterOfficerDocuments(found, filter), [found, filter])

  const refresh = async () => {
    setLoading(true)
    try {
      const foundRes = await apiRequest(API_ENDPOINTS.foundReports)
      const foundData = await foundRes.json()

      if (!foundRes.ok) throw new Error(foundData.error || 'Failed to load found documents')

      setFound((foundData.reports || []) as OfficerDoc[])
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

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiRequest(API_ENDPOINTS.me)
        const data = await res.json()
        if (res.ok && data.user?.stationName) {
          setStationName(String(data.user.stationName))
        }
      } catch {
        /* optional */
      }
    })()
  }, [])

  const openManage = (doc: OfficerDoc) => {
    setManageDoc(doc)
    setManageOpen(true)
  }

  const statHref = (f: OfficerDocFilter) =>
    f === 'all' ? '/dashboard/officer' : `/dashboard/officer?filter=${f}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {stationName ? stationName : 'Station documents'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {OFFICER_FILTER_LABELS[filter]} · {displayed.length} shown
          </p>
        </div>

        <Button onClick={() => setReportFoundOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Register found document
        </Button>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total registered"
          value={summary.foundCount}
          href={statHref('all')}
          icon={FileStack}
          active={filter === 'all'}
        />
        <StatCard
          label="At station"
          value={summary.atStation}
          href={statHref('at_station')}
          icon={Package}
          active={filter === 'at_station'}
        />
        <StatCard
          label="Claims pending"
          value={summary.claimPending}
          href={statHref('claim_pending')}
          icon={Clock}
          active={filter === 'claim_pending'}
        />
        <StatCard
          label="Collected"
          value={summary.handedOver}
          href={statHref('collected')}
          icon={CheckCircle2}
          active={filter === 'collected'}
        />
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{OFFICER_FILTER_LABELS[filter]}</h2>
          <div className="flex items-center gap-2">
            {filter !== 'all' ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/officer">Show all</Link>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Claims</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {String(r.documentType).replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.documentNumber || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.foundLocation || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        foundReportStatusClass(r.status)
                      )}
                    >
                      {foundReportStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(r.pendingClaimCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-800">
                        <Users className="h-3.5 w-3.5" />
                        {r.pendingClaimCount} pending
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openManage(r)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && displayed.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={6}>
                    {found.length === 0
                      ? 'No documents registered yet.'
                      : 'No documents match this filter.'}
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

      <OfficerDocumentModal
        open={manageOpen}
        onOpenChange={setManageOpen}
        document={manageDoc}
        onUpdated={refresh}
      />
    </div>
  )
}

export default function OfficerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OfficerDashboardContent />
    </Suspense>
  )
}
