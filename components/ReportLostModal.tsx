'use client'

import React, { useState, FormEvent, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'
import { maxLostDateInputValue, validateLostDateNotFuture } from '@/lib/lost-date'

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ATM_CARD', label: 'ATM Card' },
  { value: 'STUDENT_CARD', label: 'Student Card' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'OTHER', label: 'Other' },
]

const STAFF_ROLES = ['ADMIN', 'OFFICER', 'INSTITUTION']

interface ReportLostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Staff dashboard: skip contact fields (account is linked on the server). */
  variant?: 'public' | 'staff'
}

export function ReportLostModal({ open, onOpenChange, variant = 'public' }: ReportLostModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [useStaffForm, setUseStaffForm] = useState(variant === 'staff')
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    description: '',
    lostLocation: '',
    lostDate: '',
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
  })

  useEffect(() => {
    if (variant === 'staff') {
      setUseStaffForm(true)
      return
    }
    if (!open) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await apiRequest('/api/auth/me')
        const data = await res.json()
        if (!cancelled) {
          const loggedIn = !!data.user
          const staff =
            loggedIn && data.user?.role && STAFF_ROLES.includes(data.user.role)
          setUseStaffForm(staff || loggedIn)
        }
      } catch {
        if (!cancelled) setUseStaffForm(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, variant])

  const resetForm = () => {
    setFormData({
      documentType: '',
      documentNumber: '',
      description: '',
      lostLocation: '',
      lostDate: '',
      reporterName: '',
      reporterEmail: '',
      reporterPhone: '',
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const lostDateError = validateLostDateNotFuture(formData.lostDate)
    if (lostDateError) {
      toast({ title: 'Invalid date', description: lostDateError, variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const payload: Record<string, string> = {
        documentType: formData.documentType,
        lostLocation: formData.lostLocation,
      }
      if (formData.documentNumber.trim()) payload.documentNumber = formData.documentNumber.trim()
      if (formData.description.trim()) payload.description = formData.description.trim()
      if (formData.lostDate.trim()) payload.lostDate = formData.lostDate.trim()

      if (!useStaffForm) {
        payload.reporterName = formData.reporterName
        payload.reporterEmail = formData.reporterEmail
        if (formData.reporterPhone.trim()) payload.reporterPhone = formData.reporterPhone.trim()
      }

      const response = await apiRequest(API_ENDPOINTS.lostReports, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please log in first to report a missing document',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to report missing document',
            variant: 'destructive',
          })
        }
        return
      }

      toast({
        title: 'Success',
        description: `Reported. ${data.matchesFound || 0} potential match(es).`,
      })

      resetForm()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Report submission error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{useStaffForm ? 'Report lost document' : 'Report missing document'}</DialogTitle>
          <DialogDescription className="sr-only">
            {useStaffForm
              ? 'Create a lost report linked to your account'
              : 'Report a missing document'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!useStaffForm && (
            <div className="space-y-3 pb-2 border-b border-gray-200">
              <p className="text-sm text-gray-600">Contact (if we find a match)</p>
              <div className="space-y-1.5">
                <Label htmlFor="reporterName">Name</Label>
                <Input
                  id="reporterName"
                  type="text"
                  value={formData.reporterName}
                  onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reporterEmail">Email</Label>
                <Input
                  id="reporterEmail"
                  type="email"
                  value={formData.reporterEmail}
                  onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reporterPhone">Phone (optional)</Label>
                <Input
                  id="reporterPhone"
                  type="tel"
                  value={formData.reporterPhone}
                  onChange={(e) => setFormData({ ...formData, reporterPhone: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="documentType">Document type</Label>
            <Select
              value={formData.documentType}
              onValueChange={(value) => setFormData({ ...formData, documentType: value })}
              required
            >
              <SelectTrigger id="documentType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lostLocation">Where it was lost</Label>
            <Input
              id="lostLocation"
              type="text"
              placeholder="Location"
              value={formData.lostLocation}
              onChange={(e) => setFormData({ ...formData, lostLocation: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lostDate">When it was lost (optional)</Label>
            <Input
              id="lostDate"
              type="date"
              max={maxLostDateInputValue()}
              value={formData.lostDate}
              onChange={(e) => setFormData({ ...formData, lostDate: e.target.value })}
            />
            <p className="text-xs text-gray-500">Cannot be a future date.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documentNumber">Document number (optional)</Label>
            <Input
              id="documentNumber"
              type="text"
              value={formData.documentNumber}
              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Notes (optional)</Label>
            <textarea
              id="description"
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.documentType}>
              {loading ? 'Saving…' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
