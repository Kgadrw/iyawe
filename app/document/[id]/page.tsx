'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileQuestion, FileCheck, MapPin, Calendar, User, Mail, Phone, Hash, FileText, ArrowLeft, Home } from 'lucide-react'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  const [document, setDocument] = useState<any | null>(null)
  const [relatedDocuments, setRelatedDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [documentType, setDocumentType] = useState<'lost' | 'found' | null>(null)

  useEffect(() => {
    // Extract type from URL
    const searchParams = new URLSearchParams(window.location.search)
    const urlType = searchParams.get('type') as 'lost' | 'found' | null
    
    if (urlType && (urlType === 'lost' || urlType === 'found')) {
      setDocumentType(urlType)
      fetchDocument(urlType)
    } else {
      // Try both types if not specified
      fetchDocument('lost').then((found) => {
        if (!found) {
          fetchDocument('found')
        }
      })
    }
  }, [documentId])

  const fetchDocument = async (type: 'lost' | 'found'): Promise<boolean> => {
    try {
      setLoading(true)
      // Use the frontend API endpoint (Next.js API route)
      const response = await fetch(`/api/documents/${documentId}?type=${type}`)
      
      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
        setRelatedDocuments(data.relatedDocuments || [])
        setDocumentType(type)
        return true
      }
      return false
    } catch (error) {
      console.error('Error fetching document:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
            <p className="text-gray-600 mb-6">The document you're looking for doesn't exist or has been removed.</p>
            <Link href="/">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isLost = document.type === 'lost'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Document Details - Left Side (2/3 width) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isLost ? (
                      <FileQuestion className="h-6 w-6 text-orange-500" />
                    ) : (
                      <FileCheck className="h-6 w-6 text-green-500" />
                    )}
                    <CardTitle className="text-2xl">Document Details</CardTitle>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      isLost 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {isLost ? 'Missing' : 'Recovered'}
                    </span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    document.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    document.status === 'MATCHED' ? 'bg-blue-100 text-blue-700' :
                    document.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {document.status}
                  </span>
                </div>
                <CardDescription>
                  Complete information about this {isLost ? 'missing' : 'recovered'} document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Document Image (for found documents) */}
                {!isLost && document.image && (
                  <div className="w-full">
                    <img 
                      src={document.image} 
                      alt="Document" 
                      className="w-full h-96 object-contain rounded-lg border border-gray-200 bg-gray-50"
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

                  {document.user?.phone && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Phone className="h-4 w-4" />
                        <span>Phone</span>
                      </div>
                      <p className="text-gray-900">{document.user.phone}</p>
                    </div>
                  )}
                </div>

                {/* Status and Dates */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
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
              </CardContent>
            </Card>
          </div>

          {/* Related Documents - Right Side (1/3 width) */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Documents</CardTitle>
                <CardDescription>
                  Other {document.documentType?.replace(/_/g, ' ') || 'documents'} in the same category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {relatedDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileQuestion className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No related documents found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {relatedDocuments.map((relatedDoc) => (
                      <Link
                        key={`${relatedDoc.type}-${relatedDoc.id}`}
                        href={`/document/${relatedDoc.id}?type=${relatedDoc.type}`}
                      >
                        <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {relatedDoc.type === 'lost' ? (
                                <FileQuestion className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <FileCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    relatedDoc.type === 'lost' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {relatedDoc.type === 'lost' ? 'Missing' : 'Recovered'}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {relatedDoc.documentType?.replace(/_/g, ' ') || 'Document'}
                                  </span>
                                </div>
                                {(relatedDoc.lostLocation || relatedDoc.foundLocation) && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="line-clamp-1">
                                      {relatedDoc.lostLocation || relatedDoc.foundLocation}
                                    </span>
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(relatedDoc.reportDate || relatedDoc.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
