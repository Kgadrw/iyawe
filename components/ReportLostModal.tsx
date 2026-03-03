'use client'

import React, { useState, FormEvent } from 'react'
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
import { Calendar } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ATM_CARD', label: 'ATM Card' },
  { value: 'STUDENT_CARD', label: 'Student Card' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'OTHER', label: 'Other' },
]

interface ReportLostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportLostModal({ open, onOpenChange }: ReportLostModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    description: '',
    lostDate: '',
    lostLocation: '',
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiRequest(API_ENDPOINTS.lostReports, {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to report missing document',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Success',
        description: `Missing document reported! ${data.matchesFound || 0} potential matches found.`,
      })

      // Reset form and close modal
      setFormData({
        documentType: '',
        documentNumber: '',
        description: '',
        lostDate: '',
        lostLocation: '',
        reporterName: '',
        reporterEmail: '',
        reporterPhone: '',
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Missing Document</DialogTitle>
          <DialogDescription>
            Report your missing document to help others find it. Your information is kept private.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reporter Information Section */}
          <div className="border-t border-b border-gray-200 py-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Your Contact Information</h3>
            <p className="text-xs text-gray-500">
              This information helps us contact you if your document is found. It will be kept private.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="reporterName">Your Name *</Label>
              <Input
                id="reporterName"
                type="text"
                placeholder="Enter your full name"
                value={formData.reporterName}
                onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reporterEmail">Your Email *</Label>
              <Input
                id="reporterEmail"
                type="email"
                placeholder="your.email@example.com"
                value={formData.reporterEmail}
                onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reporterPhone">Your Phone (Optional)</Label>
              <Input
                id="reporterPhone"
                type="tel"
                placeholder="+1234567890"
                value={formData.reporterPhone}
                onChange={(e) => setFormData({ ...formData, reporterPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Document Information Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Document Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => setFormData({ ...formData, documentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
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

            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number (Optional)</Label>
              <Input
                id="documentNumber"
                type="text"
                placeholder="Enter document number if known"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                This helps us match with found reports. Only partial information is stored for security.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lostDate">Date Lost (Optional)</Label>
              <Input
                id="lostDate"
                type="date"
                value={formData.lostDate}
                onChange={(e) => setFormData({ ...formData, lostDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lostLocation">Location Lost *</Label>
              <Input
                id="lostLocation"
                type="text"
                placeholder="e.g., Downtown Mall, Main Street"
                value={formData.lostLocation}
                onChange={(e) => setFormData({ ...formData, lostLocation: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (Optional)</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any additional information about when or where you lost it..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Reporting...' : 'Report Missing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
