'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS, apiRequest } from '@/lib/api'
import { foundReportStatusClass, foundReportStatusLabel } from '@/lib/officer-report-status'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'

type ClaimRow = {
  id: string
  claimantName: string
  claimantEmail: string
  claimantPhone?: string | null
  status: string
  description?: string | null
  createdAt?: string
  confirmationEmailSent?: boolean | null
  confirmationEmailError?: string | null
}

type ClaimedDocument = {
  id: string
  documentType: string
  documentNumber?: string | null
  foundLocation?: string | null
  status?: string
  stationName?: string | null
  listedBy?: {
    name: string
    email?: string | null
    phone?: string | null
    stationName?: string | null
  } | null
  claims: ClaimRow[]
}

export function AdminClaimsOverview() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<ClaimedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.adminClaims)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load claims')
      setDocuments((data.documents || []) as ClaimedDocument[])
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load claims',
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

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="platform-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-blue-900">Claimed documents</h2>
          <p className="text-xs text-blue-900/50 mt-0.5">
            All found documents with claims and who submitted each claim
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="divide-y divide-gray-100">
        {documents.map((doc) => {
          const isOpen = expanded[doc.id] ?? true
          const pendingCount = doc.claims.filter((c) => c.status === 'PENDING').length

          return (
            <div key={doc.id} className="px-4 sm:px-6 py-4">
              <button
                type="button"
                onClick={() => toggle(doc.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 mt-1 text-blue-900/50 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 mt-1 text-blue-900/50 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-blue-900">
                      {String(doc.documentType).replace(/_/g, ' ')}
                    </span>
                    {doc.documentNumber ? (
                      <span className="text-sm text-blue-900/70">#{doc.documentNumber}</span>
                    ) : null}
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        foundReportStatusClass(doc.status)
                      )}
                    >
                      {foundReportStatusLabel(doc.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-blue-800">
                      <Users className="h-3.5 w-3.5" />
                      {doc.claims.length} claim{doc.claims.length === 1 ? '' : 's'}
                      {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-blue-900/60">
                    {doc.foundLocation || 'Location not specified'}
                    {doc.stationName ? ` · ${doc.stationName}` : ''}
                  </p>
                  {doc.listedBy ? (
                    <p className="mt-0.5 text-xs text-blue-900/50">
                      Listed by {doc.listedBy.name}
                      {doc.listedBy.email ? ` (${doc.listedBy.email})` : ''}
                    </p>
                  ) : null}
                </div>
              </button>

              {isOpen ? (
                <ul className="mt-3 ml-7 space-y-2 border-l border-blue-100 pl-4">
                  {doc.claims.map((claim) => (
                    <li key={claim.id} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-blue-900">{claim.claimantName}</span>
                        <span
                          className={cn(
                            'text-xs rounded-full px-2 py-0.5',
                            claim.status === 'PENDING'
                              ? 'bg-blue-100 text-blue-800'
                              : claim.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                          )}
                        >
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-blue-900/70">{claim.claimantEmail}</p>
                      {claim.claimantPhone ? (
                        <p className="text-blue-900/50 text-xs">{claim.claimantPhone}</p>
                      ) : null}
                      {claim.description ? (
                        <p className="text-blue-900/50 text-xs mt-0.5">{claim.description}</p>
                      ) : null}
                      {claim.createdAt ? (
                        <p className="text-blue-900/40 text-xs mt-0.5">
                          {new Date(claim.createdAt).toLocaleString()}
                        </p>
                      ) : null}
                      {claim.confirmationEmailSent === true ? (
                        <p className="text-green-700 text-xs mt-0.5">Confirmation email sent</p>
                      ) : claim.confirmationEmailSent === false ? (
                        <p className="text-red-700 text-xs mt-0.5" title={claim.confirmationEmailError || undefined}>
                          Email not delivered
                          {claim.confirmationEmailError ? ` — ${claim.confirmationEmailError}` : ''}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}

        {!loading && documents.length === 0 ? (
          <p className="px-6 py-10 text-center text-blue-900/50 text-sm">
            No claims submitted yet.
          </p>
        ) : null}
      </div>
    </div>
  )
}
