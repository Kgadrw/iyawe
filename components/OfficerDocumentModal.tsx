'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { API_ENDPOINTS, apiRequest } from '@/lib/api'
import {
  canMarkCollected,
  canRejectClaim,
  foundReportStatusClass,
  foundReportStatusLabel,
} from '@/lib/officer-report-status'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Trash2, XCircle } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ATM_CARD', label: 'ATM Card' },
  { value: 'STUDENT_CARD', label: 'Student Card' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'OTHER', label: 'Other' },
]

export type OfficerDoc = {
  id: string
  documentType: string
  documentNumber?: string | null
  description?: string | null
  foundLocation?: string | null
  status?: string
  pendingClaimCount?: number
  claimCount?: number
  recentClaimants?: Array<{ name: string; email: string; status: string }>
}

type ClaimRow = {
  id: string
  claimantName: string
  claimantEmail: string
  claimantPhone?: string | null
  status: string
  description?: string | null
  rejectionNote?: string | null
  createdAt?: string
}

type OfficerDocumentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: OfficerDoc | null
  onUpdated: () => void
}

export function OfficerDocumentModal({
  open,
  onOpenChange,
  document,
  onUpdated,
}: OfficerDocumentModalProps) {
  const { toast } = useToast()
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [loadingClaims, setLoadingClaims] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    documentType: '',
    documentNumber: '',
    description: '',
    foundLocation: '',
  })

  const isCollected = document?.status === 'HANDED_OVER'

  useEffect(() => {
    if (!open || !document?.id) return
    setForm({
      documentType: document.documentType || '',
      documentNumber: document.documentNumber || '',
      description: document.description || '',
      foundLocation: document.foundLocation || '',
    })
    void loadClaims(document.id)
  }, [open, document?.id, document?.documentType, document?.documentNumber, document?.description, document?.foundLocation])

  const loadClaims = async (reportId: string) => {
    setLoadingClaims(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.foundReportClaims(reportId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load claims')
      setClaims((data.claims || []) as ClaimRow[])
    } catch (e: unknown) {
      setClaims([])
      toast({
        title: 'Could not load claims',
        description: e instanceof Error ? e.message : 'Failed to load claims',
        variant: 'destructive',
      })
    } finally {
      setLoadingClaims(false)
    }
  }

  const updateStatus = async (status: 'HANDED_OVER' | 'PENDING', note?: string) => {
    if (!document) return
    setSaving(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.foundReportStatus(document.id), {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(note ? { note } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      toast({ title: 'Updated', description: data.message })
      onUpdated()
      onOpenChange(false)
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!document) return
    setSaving(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.foundReport(document.id), {
        method: 'PUT',
        body: JSON.stringify({
          documentType: form.documentType,
          documentNumber: form.documentNumber || null,
          description: form.description || null,
          foundLocation: form.foundLocation || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({ title: 'Saved', description: 'Document updated' })
      onUpdated()
      onOpenChange(false)
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteDocument = async () => {
    if (!document) return
    if (!window.confirm('Delete this document permanently? This cannot be undone.')) return
    setSaving(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.foundReport(document.id), { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      toast({ title: 'Deleted', description: 'Document removed' })
      onUpdated()
      onOpenChange(false)
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage document</DialogTitle>
          <DialogDescription>
            Edit details, view claimants, or update collection status.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              foundReportStatusClass(document.status)
            )}
          >
            {foundReportStatusLabel(document.status)}
          </span>
          {(document.pendingClaimCount ?? 0) > 0 ? (
            <span className="text-xs text-blue-700">
              {document.pendingClaimCount} pending claim
              {(document.pendingClaimCount ?? 0) === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {!isCollected ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium text-slate-900">Edit document</p>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.documentType}
                onValueChange={(v) => setForm({ ...form, documentType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Document number</Label>
              <Input
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Found location</Label>
              <Input
                value={form.foundLocation}
                onChange={(e) => setForm({ ...form, foundLocation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Button onClick={() => void saveEdit()} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium text-slate-900">Claimants</p>
          {loadingClaims ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading claims…
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No claims submitted yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {claims.map((c) => (
                <li key={c.id} className="py-2 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.claimantName}</span>
                    <span
                      className={cn(
                        'text-xs rounded-full px-2 py-0.5',
                        c.status === 'PENDING'
                          ? 'bg-blue-100 text-blue-800'
                          : c.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                      )}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-slate-600">{c.claimantEmail}</p>
                  {c.claimantPhone ? <p className="text-slate-500">{c.claimantPhone}</p> : null}
                  {c.description ? (
                    <p className="text-slate-500 text-xs">{c.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {canRejectClaim(document.status) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              className="text-red-700 border-red-200"
              onClick={() => {
                if (
                  window.confirm('Reject pending claim(s)? Document returns to station.')
                ) {
                  void updateStatus('PENDING', 'Claim rejected by station staff')
                }
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject claim
            </Button>
          ) : null}
          {canMarkCollected(document.status) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              className="text-green-700 border-green-200"
              onClick={() => {
                if (window.confirm('Mark as collected by verified owner?')) {
                  void updateStatus('HANDED_OVER')
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark collected
            </Button>
          ) : null}
          {!isCollected ? (
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              className="text-red-700 border-red-200 ml-auto"
              onClick={() => void deleteDocument()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
