'use client'

import { useState, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'
import {
  SubizwaAlertModal,
  alertFieldClass,
  alertGhostButtonClass,
  alertLabelClass,
  alertPrimaryButtonClass,
} from '@/components/platform/SubizwaAlertModal'
import { Mail, MapPin } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ATM_CARD', label: 'ATM Card' },
  { value: 'STUDENT_CARD', label: 'Student Card' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'OTHER', label: 'Other' },
]

interface DocumentWatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentWatchModal({ open, onOpenChange }: DocumentWatchModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    documentType: '',
    documentNumber: '',
    lostLocation: '',
    lostDate: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.documentType) {
      toast({ title: 'Select document type', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await apiRequest(API_ENDPOINTS.documentWatch, {
        method: 'POST',
        body: JSON.stringify({
          documentType: form.documentType,
          documentNumber: form.documentNumber || undefined,
          lostLocation: form.lostLocation || undefined,
          lostDate: form.lostDate || undefined,
          description: form.description || undefined,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register alert')
      }

      toast({
        title: data.alreadyListed ? 'May already be listed' : 'Alert registered',
        description: data.message,
        className: 'border-l-4 border-l-gold-400 bg-white text-blue-900',
      })

      setForm({
        documentType: '',
        documentNumber: '',
        lostLocation: '',
        lostDate: '',
        description: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
      })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Could not save alert',
        description: err instanceof Error ? err.message : 'Failed to register alert',
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
      variant="watch"
      maxWidth="3xl"
      title="Email alert when your document is listed"
      description="Tell us what you lost. We will email you as soon as a station registers a matching found document on Subizwa."
      highlight={
        <p className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-gold-400 shrink-0 mt-0.5" />
          <span>No account needed — we only use your email to notify you.</span>
        </p>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            className={alertGhostButtonClass}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="watch-alert-form"
            disabled={loading}
            className={alertPrimaryButtonClass}
          >
            {loading ? 'Saving…' : 'Register alert'}
          </Button>
        </div>
      }
    >
      <form id="watch-alert-form" onSubmit={handleSubmit}>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900/50 mb-4">
          Document details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={alertLabelClass}>Document type</Label>
            <Select
              value={form.documentType}
              onValueChange={(v) => setForm({ ...form, documentType: v })}
            >
              <SelectTrigger className={`${alertFieldClass} w-full`}>
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
            <Label htmlFor="watchDocNumber" className={alertLabelClass}>
              Document number
            </Label>
            <Input
              id="watchDocNumber"
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              className={alertFieldClass}
              placeholder="Recommended for accuracy"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchLostDate" className={alertLabelClass}>
              Date lost
            </Label>
            <Input
              id="watchLostDate"
              type="date"
              value={form.lostDate}
              onChange={(e) => setForm({ ...form, lostDate: e.target.value })}
              className={alertFieldClass}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="watchLostLocation" className={alertLabelClass}>
              Where you lost it
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-900/35" />
              <Input
                id="watchLostLocation"
                value={form.lostLocation}
                onChange={(e) => setForm({ ...form, lostLocation: e.target.value })}
                className={`${alertFieldClass} pl-9`}
                placeholder="Area, sector, or landmark"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="watchDescription" className={alertLabelClass}>
              Other details
            </Label>
            <Input
              id="watchDescription"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={alertFieldClass}
              placeholder="Optional — colour, name on card, etc."
            />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900/50 mt-6 mb-4 pt-4 border-t border-gray-100">
          Your contact
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="watchName" className={alertLabelClass}>
              Your name
            </Label>
            <Input
              id="watchName"
              required
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className={alertFieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchEmail" className={alertLabelClass}>
              Email
            </Label>
            <Input
              id="watchEmail"
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className={alertFieldClass}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="watchPhone" className={alertLabelClass}>
              Phone (optional)
            </Label>
            <Input
              id="watchPhone"
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className={alertFieldClass}
            />
          </div>
        </div>
      </form>
    </SubizwaAlertModal>
  )
}
