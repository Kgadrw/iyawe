'use client'

import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { apiRequest } from '@/lib/api'
import { maxLostDateInputValue, validateLostDateNotFuture } from '@/lib/lost-date'
import {
  SubizwaAlertModal,
  alertFieldClass,
  alertLabelClass,
  alertPrimaryButtonClass,
} from '@/components/platform/SubizwaAlertModal'
import { Building2, Calendar, Hash } from 'lucide-react'

export type ClaimableDocument = {
  id: string
  documentType?: string
  documentNumber?: string | null
  foundLocation?: string | null
  status?: string
  station?: { name?: string; address?: string | null } | null
}

interface ClaimDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: ClaimableDocument | null
  onSuccess?: () => void
}

export function ClaimDocumentModal({
  open,
  onOpenChange,
  document,
  onSuccess,
}: ClaimDocumentModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    claimantName: '',
    claimantEmail: '',
    claimantPhone: '',
    lostDate: '',
    description: '',
    documentNumber: '',
  })

  const docLabel = document?.documentType?.replace(/_/g, ' ') || 'Document'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!document?.id) return

    const lostDateError = validateLostDateNotFuture(form.lostDate)
    if (lostDateError) {
      toast({ title: 'Invalid date', description: lostDateError, variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await apiRequest('/api/claims', {
        method: 'POST',
        body: JSON.stringify({
          foundReportId: document.id,
          claimantName: form.claimantName,
          claimantEmail: form.claimantEmail,
          claimantPhone: form.claimantPhone || undefined,
          lostDate: form.lostDate || undefined,
          description: form.description || undefined,
          documentNumber: form.documentNumber || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit claim')
      }

      const stationName = data.station?.name || 'the station'
      toast({
        title: 'Claim submitted',
        description: data.emailSent
          ? `Collect at ${stationName} with valid ID. A confirmation was sent to ${form.claimantEmail}.`
          : data.emailError
            ? `${data.emailError} Visit ${stationName} with valid ID.`
            : `Visit ${stationName} with valid ID to collect your document.`,
        className: 'border-l-4 border-l-gold-400 bg-white text-blue-900',
      })

      setForm({
        claimantName: '',
        claimantEmail: '',
        claimantPhone: '',
        lostDate: '',
        description: '',
        documentNumber: '',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      toast({
        title: 'Could not submit claim',
        description: err instanceof Error ? err.message : 'Failed to submit claim',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SubizwaAlertModal
      open={open}
      onOpenChange={onOpenChange}
      variant="claim"
      maxWidth="md"
      title="Claim this document"
      description="Confirm this is yours. Others may also claim the same document — the station will verify the rightful owner."
      highlight={
        <div className="space-y-2">
          <p className="font-medium text-white flex items-center gap-2">
            <Hash className="h-4 w-4 text-gold-400 shrink-0" />
            {docLabel}
            {document?.documentNumber ? (
              <span className="font-normal text-white/80">· {document.documentNumber}</span>
            ) : null}
          </p>
          {document?.station?.name ? (
            <p className="flex items-start gap-2 text-white/85">
              <Building2 className="h-4 w-4 text-gold-400 shrink-0 mt-0.5" />
              <span>
                Collect at <strong className="text-gold-400">{document.station.name}</strong>
                {document.station.address ? (
                  <span className="block text-xs text-white/60 mt-0.5">{document.station.address}</span>
                ) : null}
              </span>
            </p>
          ) : null}
          {document?.foundLocation ? (
            <p className="text-xs text-white/60 pl-6">Found near: {document.foundLocation}</p>
          ) : null}
        </div>
      }
      footer={
        <Button
          type="submit"
          form="claim-document-form"
          disabled={loading}
          className={`w-full sm:w-auto sm:ml-auto ${alertPrimaryButtonClass}`}
        >
          {loading ? 'Submitting…' : 'Submit claim'}
        </Button>
      }
    >
      <form id="claim-document-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="claimantName" className={alertLabelClass}>
            Full name
          </Label>
          <Input
            id="claimantName"
            required
            value={form.claimantName}
            onChange={(e) => setForm({ ...form, claimantName: e.target.value })}
            className={alertFieldClass}
            placeholder="As shown on the document"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="claimantEmail" className={alertLabelClass}>
              Email
            </Label>
            <Input
              id="claimantEmail"
              type="email"
              required
              value={form.claimantEmail}
              onChange={(e) => setForm({ ...form, claimantEmail: e.target.value })}
              className={alertFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claimantPhone" className={alertLabelClass}>
              Phone
            </Label>
            <Input
              id="claimantPhone"
              type="tel"
              value={form.claimantPhone}
              onChange={(e) => setForm({ ...form, claimantPhone: e.target.value })}
              className={alertFieldClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lostDate" className={alertLabelClass}>
            When did you lose it?
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-900/35" />
            <Input
              id="lostDate"
              type="date"
              max={maxLostDateInputValue()}
              value={form.lostDate}
              onChange={(e) => setForm({ ...form, lostDate: e.target.value })}
              className={`${alertFieldClass} pl-9`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="claimDocNumber" className={alertLabelClass}>
            Document number (if known)
          </Label>
          <Input
            id="claimDocNumber"
            placeholder={document?.documentNumber || 'Optional'}
            value={form.documentNumber}
            onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
            className={alertFieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="claimDescription" className={alertLabelClass}>
            Additional details
          </Label>
          <Input
            id="claimDescription"
            placeholder="Where you lost it, distinguishing marks, etc."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={alertFieldClass}
          />
        </div>

        <p className="text-xs text-blue-900/50 leading-relaxed rounded-xl bg-blue-50/80 border border-blue-100 px-3 py-2.5">
          Bring valid ID to the station listed above. A confirmation email will be sent to your address.
        </p>
      </form>
    </SubizwaAlertModal>
  )
}
