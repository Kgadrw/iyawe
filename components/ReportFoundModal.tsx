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
    uploaderName: '',
    uploaderEmail: '',
    uploaderPhone: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let response: Response

      if (imageFile) {
        // If image is provided, use FormData
        const formDataToSend = new FormData()
        formDataToSend.append('documentType', formData.documentType)
        formDataToSend.append('documentNumber', formData.documentNumber || '')
        formDataToSend.append('description', formData.description || '')
        formDataToSend.append('foundLocation', formData.foundLocation)
        formDataToSend.append('uploaderName', formData.uploaderName || '')
        formDataToSend.append('uploaderEmail', formData.uploaderEmail || '')
        formDataToSend.append('uploaderPhone', formData.uploaderPhone || '')
        formDataToSend.append('image', imageFile)

        response = await apiRequest(API_ENDPOINTS.foundReports, {
          method: 'POST',
          body: formDataToSend,
        })
      } else {
        // If no image, use JSON
        response = await apiRequest(API_ENDPOINTS.foundReports, {
          method: 'POST',
          body: JSON.stringify(formData),
        })
      }

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
        description: `Document uploaded! ${data.matchesFound || 0} potential matches found.`,
      })

      // Reset form and close modal
      setFormData({
        documentType: '',
        documentNumber: '',
        description: '',
        foundLocation: '',
        uploaderName: '',
        uploaderEmail: '',
        uploaderPhone: '',
      })
      setImageFile(null)
      setImagePreview(null)
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
          <DialogTitle>Upload Recovered Document</DialogTitle>
          <DialogDescription>
            Help someone recover their missing document. Your information is kept private.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Uploader Information Section */}
          <div className="border-t border-b border-gray-200 py-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Your Contact Information</h3>
            <p className="text-xs text-gray-500">
              This information helps us contact you if a match is found. It will be kept private.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="uploaderName">Your Name *</Label>
              <Input
                id="uploaderName"
                type="text"
                placeholder="Enter your full name"
                value={formData.uploaderName}
                onChange={(e) => setFormData({ ...formData, uploaderName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uploaderEmail">Your Email *</Label>
              <Input
                id="uploaderEmail"
                type="email"
                placeholder="your.email@example.com"
                value={formData.uploaderEmail}
                onChange={(e) => setFormData({ ...formData, uploaderEmail: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uploaderPhone">Your Phone (Optional)</Label>
              <Input
                id="uploaderPhone"
                type="tel"
                placeholder="+1234567890"
                value={formData.uploaderPhone}
                onChange={(e) => setFormData({ ...formData, uploaderPhone: e.target.value })}
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
              placeholder="Enter document number if visible"
              value={formData.documentNumber}
              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              This helps us match with lost reports. Only partial information is stored for security.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foundLocation">Location Found *</Label>
            <Input
              id="foundLocation"
              type="text"
              placeholder="e.g., Downtown Mall, Main Street"
              value={formData.foundLocation}
              onChange={(e) => setFormData({ ...formData, foundLocation: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Any additional information about where or how you found it..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Upload Document Image (Optional)</Label>
            <div className="space-y-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Document preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 10MB</p>
                  </div>
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
                        reader.onloadend = () => {
                          setImagePreview(reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Upload a photo of the recovered document to help with identification and matching.
            </p>
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
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
