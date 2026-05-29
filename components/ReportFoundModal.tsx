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
import { Image as ImageIcon, X } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'ID Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'ATM_CARD', label: 'ATM Card' },
  { value: 'STUDENT_CARD', label: 'Student Card' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'OTHER', label: 'Other' },
]

interface ReportFoundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ReportFoundModal({ open, onOpenChange }: ReportFoundModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    description: '',
    foundLocation: '',
  })

  const resetForm = () => {
    setFormData({
      documentType: '',
      documentNumber: '',
      description: '',
      foundLocation: '',
    })
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: Record<string, string> = {
        documentType: formData.documentType,
        foundLocation: formData.foundLocation,
      }
      if (formData.documentNumber.trim()) payload.documentNumber = formData.documentNumber.trim()
      if (formData.description.trim()) payload.description = formData.description.trim()
      if (imageFile) payload.image = await fileToDataUrl(imageFile)

      const response = await apiRequest(API_ENDPOINTS.foundReports, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to upload document',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Success',
        description: `Uploaded. ${data.matchesFound || 0} potential match(es).`,
      })

      resetForm()
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload found document</DialogTitle>
          <DialogDescription className="sr-only">
            Record a recovered document under your account
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="foundLocation">Where it was found</Label>
            <Input
              id="foundLocation"
              type="text"
              placeholder="Location"
              value={formData.foundLocation}
              onChange={(e) => setFormData({ ...formData, foundLocation: e.target.value })}
              required
            />
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

          <div className="space-y-1.5">
            <Label htmlFor="image-upload">Photo (optional)</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-contain rounded-md border border-gray-200 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                  }}
                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-gray-900/70 text-white rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">Add photo</span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setImageFile(file)
                      const reader = new FileReader()
                      reader.onloadend = () => setImagePreview(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.documentType}>
              {loading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
