'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileQuestion, FileCheck, MapPin, Calendar, User, Mail, Phone, Hash, FileText } from 'lucide-react'

interface DocumentDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: any | null
}

export function DocumentDetailsModal({ open, onOpenChange, document }: DocumentDetailsModalProps) {
  if (!document) return null

  const isLost = document.type === 'lost'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLost ? (
              <FileQuestion className="h-5 w-5 text-orange-500" />
            ) : (
              <FileCheck className="h-5 w-5 text-green-500" />
            )}
            <span>Document Details</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ml-2 ${
              isLost 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {isLost ? 'Missing' : 'Recovered'}
            </span>
          </DialogTitle>
          <DialogDescription>
            Complete information about this {isLost ? 'missing' : 'recovered'} document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Image (for found documents) */}
          {!isLost && document.image && (
            <div className="w-full">
              <img 
                src={document.image} 
                alt="Document" 
                className="w-full h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
              />
            </div>
          )}

          {/* Document Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4" />
              <span>Document Type</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {document.documentType?.replace(/_/g, ' ') || 'Document'}
            </p>
          </div>

          {/* Document Number */}
          {document.documentNumber && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Hash className="h-4 w-4" />
                <span>Document Number</span>
              </div>
              <p className="text-gray-900">{document.documentNumber}</p>
            </div>
          )}

          {/* Location */}
          {(document.lostLocation || document.foundLocation) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </div>
              <p className="text-gray-900">
                {isLost ? document.lostLocation : document.foundLocation}
              </p>
            </div>
          )}

          {/* Date */}
          {(document.lostDate || document.foundDate || document.reportDate) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                <span>{isLost ? 'Date Missing' : 'Date Recovered'}</span>
              </div>
              <p className="text-gray-900">
                {new Date(document.lostDate || document.foundDate || document.reportDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Description */}
          {document.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" />
                <span>Description</span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{document.description}</p>
            </div>
          )}

          {/* Reporter/Uploader Information */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-900">
              {isLost ? 'Reporter Information' : 'Uploader Information'}
            </h3>
            
            {document.user?.name && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  <span>Name</span>
                </div>
                <p className="text-gray-900">{document.user.name}</p>
              </div>
            )}

            {document.user?.email && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="text-gray-900">{document.user.email}</p>
              </div>
            )}

            {(document.user?.phone || document.uploaderPhone || document.reporterPhone) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone className="h-4 w-4" />
                  <span>Phone</span>
                </div>
                <p className="text-gray-900">
                  {document.user?.phone || document.uploaderPhone || document.reporterPhone}
                </p>
              </div>
            )}

            {/* Show reporter/uploader contact info for anonymous reports */}
            {!document.user && (
              <>
                {document.reporterName && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4" />
                      <span>Name</span>
                    </div>
                    <p className="text-gray-900">{document.reporterName}</p>
                  </div>
                )}
                {document.reporterEmail && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                    <p className="text-gray-900">{document.reporterEmail}</p>
                  </div>
                )}
                {document.reporterPhone && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="h-4 w-4" />
                      <span>Phone</span>
                    </div>
                    <p className="text-gray-900">{document.reporterPhone}</p>
                  </div>
                )}
                {document.uploaderName && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4" />
                      <span>Name</span>
                    </div>
                    <p className="text-gray-900">{document.uploaderName}</p>
                  </div>
                )}
                {document.uploaderEmail && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                    <p className="text-gray-900">{document.uploaderEmail}</p>
                  </div>
                )}
                {document.uploaderPhone && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Phone className="h-4 w-4" />
                      <span>Phone</span>
                    </div>
                    <p className="text-gray-900">{document.uploaderPhone}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status and Dates */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                document.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                document.status === 'MATCHED' ? 'bg-blue-100 text-blue-700' :
                document.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {document.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Reported on</span>
              <span className="text-gray-900">
                {new Date(document.createdAt || document.reportDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
