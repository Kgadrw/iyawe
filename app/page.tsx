'use client'

import { useState, useEffect, useRef, Fragment, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Search, CheckCircle, Building2, Calendar, Ticket, Compass, MessageCircle, FileQuestion, FileCheck, MapPin, Clock, Filter, LogIn, User, Mail, Phone, Hash, FileText, ArrowLeft, X, ChevronDown, ChevronUp, AlertCircle, Heart, Award, AlertTriangle, Info, Lock, Users, Eye, Menu } from 'lucide-react'
import { apiRequest, API_ENDPOINTS, publicApiUrl } from '@/lib/api'
import { flattenSearchResults } from '@/lib/search-results'
import {
  applyCategoryFilter,
  applyDocumentViewFilter,
  getDocumentViewCounts,
  getEmptyFilterMessage,
  type DocumentViewType,
} from '@/lib/document-view-filters'
import { dashboardPathForStaffRole } from '@/lib/dashboard-routes'
import { cn } from '@/lib/utils'
import { ClaimDocumentModal, type ClaimableDocument } from '@/components/ClaimDocumentModal'
import { DocumentWatchModal } from '@/components/DocumentWatchModal'
import { AdBannerTopRow, AdSidebarStack } from '@/components/AdSlots'
import type { PublicAd } from '@/lib/ads'
export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [latestDocuments, setLatestDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [handoverPoints, setHandoverPoints] = useState<any[]>([])
  const [handoverPointsLoading, setHandoverPointsLoading] = useState(true)
  const [bannerAds, setBannerAds] = useState<PublicAd[]>([])
  const [sidebarAds, setSidebarAds] = useState<PublicAd[]>([])
  const [adsLoading, setAdsLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [documentViewType, setDocumentViewType] = useState<DocumentViewType>('all')
  const [allDocumentsForCounts, setAllDocumentsForCounts] = useState<any[]>([])
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: '',
  })
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [dropdownDetails, setDropdownDetails] = useState<Record<string, { document: any; relatedDocuments: any[] }>>({})
  const [dropdownLoading, setDropdownLoading] = useState<Record<string, boolean>>({})
  const [viewingImage, setViewingImage] = useState<{ url: string; alt: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [urgentDocuments, setUrgentDocuments] = useState<any[]>([])
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimDocument, setClaimDocument] = useState<ClaimableDocument | null>(null)
  const [watchModalOpen, setWatchModalOpen] = useState(false)
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const router = useRouter()
  const { toast } = useToast()
  const navSearchRef = useRef<HTMLDivElement>(null)
  const heroSearchRef = useRef<HTMLDivElement>(null)
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('staffLogin') === '1') {
      setLoginModalOpen(true)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const fetchHandoverPoints = async () => {
    try {
      setHandoverPointsLoading(true)
      const response = await apiRequest(API_ENDPOINTS.institutions)
      if (response.ok) {
        const data = await response.json()
        // Map institutions to handover points format
        const mappedPoints = (data.institutions || []).map((institution: any) => {
          // Map institution type to color scheme
          const typeColors: Record<string, { color: string; statusColor: string }> = {
            POLICE_STATION: { color: 'from-blue-600 to-blue-800', statusColor: 'text-blue-600' },
            BANK: { color: 'from-green-500 to-green-700', statusColor: 'text-green-600' },
            UNIVERSITY: { color: 'from-purple-500 to-purple-700', statusColor: 'text-purple-600' },
            SECTOR_OFFICE: { color: 'from-orange-500 to-orange-700', statusColor: 'text-orange-600' },
            OTHER: { color: 'from-gray-500 to-gray-700', statusColor: 'text-gray-600' },
          }
          
          const colors = typeColors[institution.type] || typeColors.OTHER
          
          return {
            id: institution.id,
            title: institution.name,
            subtitle: institution.type.replace(/_/g, ' '),
            color: colors.color,
            textColor: 'text-white',
            statusColor: colors.statusColor,
            location: institution.address,
            status: institution.isActive ? 'Active' : 'Inactive',
            phone: institution.phone,
            email: institution.email,
            image: institution.image,
          }
        })
        setHandoverPoints(mappedPoints)
      }
    } catch (error) {
      console.error('Error fetching handover points:', error)
    } finally {
      setHandoverPointsLoading(false)
    }
  }

  const fetchUrgentDocuments = async () => {
    try {
      const response = await apiRequest(`${API_ENDPOINTS.latestDocuments(100)}`)
      if (response.ok) {
        const data = await response.json()
        const urgent = (data.documents || []).filter((doc: any) => doc.isUrgent === true).slice(0, 5)
        setUrgentDocuments(urgent)
      }
    } catch (error) {
      console.error('Error fetching urgent documents:', error)
    }
  }

  const fetchLatestDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      // For special filters, increase limit to get all matching documents
      const limitValue =
        documentViewType === 'urgent' ||
        documentViewType === 'claimed' ||
        documentViewType === 'collected'
          ? '1000'
          : '50'
      params.append('limit', limitValue)

      if (documentViewType !== 'all') {
        params.append('filter', documentViewType)
      }
      
      // Add category filter if not 'all'
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      const response = await apiRequest(`/api/documents/latest?${params.toString()}`)
        const data = await response.json()
      
      // Check if there's an error in the response (even if status is 200)
      if (data.error || !response.ok) {
        console.error('API Error:', data.error, data.details)
        toast({
          title: 'Database connection error',
          description:
            data.details ||
            data.error ||
            'Check DATABASE_URL in .env.local and restart npm run dev.',
          variant: 'destructive',
        })
        setLatestDocuments([])
        return
      }
      
      let documents = data.documents || []
      
      // Ensure all documents have the required fields
      const normalizedDocuments = documents.map((doc: any) => ({
        id: doc.id,
        type: doc.type || (doc.lostDate ? 'lost' : 'found'),
        documentType: doc.documentType || 'OTHER',
        documentNumber: doc.documentNumber || null,
        description: doc.description || null,
        lostLocation: doc.lostLocation || null,
        foundLocation: doc.foundLocation || null,
        status: doc.status || 'PENDING',
        isUrgent: doc.isUrgent || false,
        reportDate: doc.reportDate || doc.lostDate || doc.foundDate || doc.createdAt,
        image: doc.image || null,
        user: doc.user || null,
        station: doc.station || null,
      }))
      
      setLatestDocuments(normalizedDocuments)
    } catch (error) {
      console.error('Error fetching latest documents:', error)
      setLatestDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }, [documentViewType, selectedCategory])

  const toggleDocumentDropdown = async (doc: any, event?: React.MouseEvent) => {
    const docKey = `${doc.type}-${doc.id}`
    
    // Stop event propagation to prevent row click
    if (event) {
      event.stopPropagation()
    }
    
    // If already open, close it
    if (openDropdownId === docKey) {
      setOpenDropdownId(null)
      return
    }

    // Open the new dropdown
    setOpenDropdownId(docKey)

    // If details already loaded, just show them
    if (dropdownDetails[docKey]) {
      return
    }

    // Fetch document details
    try {
      setDropdownLoading(prev => ({ ...prev, [docKey]: true }))
      const response = await apiRequest(API_ENDPOINTS.document(doc.id, doc.type))
      
      if (response.ok) {
        const data = await response.json()
        console.log('Document details fetched:', data.document)
        console.log('User data:', data.document?.user)
        setDropdownDetails(prev => ({
          ...prev,
          [docKey]: {
            document: data.document,
            relatedDocuments: data.relatedDocuments || []
          }
        }))
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load document details',
          variant: 'destructive',
        })
        setOpenDropdownId(null)
      }
    } catch (error) {
      console.error('Error fetching document details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load document details',
        variant: 'destructive',
      })
      setOpenDropdownId(null)
    } finally {
      setDropdownLoading(prev => ({ ...prev, [docKey]: false }))
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const dropdownElement = dropdownRefs.current[openDropdownId]
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdownId(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

  useEffect(() => {
    const loadAds = async () => {
      try {
        setAdsLoading(true)
        const response = await fetch(publicApiUrl(API_ENDPOINTS.ads))
        if (!response.ok) {
          console.error('Ads API error:', response.status)
          return
        }
        const data = await response.json()
        setBannerAds(data.bannerTop || data.byPlacement?.BANNER_TOP || [])
        setSidebarAds(data.sidebarRight || data.byPlacement?.SIDEBAR_RIGHT || [])
      } catch (error) {
        console.error('Error fetching ads:', error)
      } finally {
        setAdsLoading(false)
      }
    }
    loadAds()
  }, [])

  useEffect(() => {
    fetchLatestDocuments()
    fetchUrgentDocuments()
  }, [documentViewType, selectedCategory])

  // Debounced search for suggestions
  useEffect(() => {
    // Clear previous timeout
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current)
    }

    // If search query is empty, clear suggestions
    if (!searchQuery.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Set loading state
    setSuggestionsLoading(true)

    // Debounce the API call
    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiRequest(API_ENDPOINTS.search(searchQuery))
        const data = await response.json()
        
        if (response.ok) {
          const allSuggestions = flattenSearchResults(data)
            .slice(0, 8)
            .map((r: any) => {
              const typeLabel = r.documentType?.replace(/_/g, ' ') || 'Document'
              const num = r.documentNumber ? ` · ${r.documentNumber}` : ''
              const detail =
                r.lostLocation || r.foundLocation || r.description || r.user?.name || ''
              return {
                ...r,
                displayText: `${typeLabel}${num}${detail ? ` — ${detail}` : ''}`.substring(0, 80),
              }
            })
          setSuggestions(allSuggestions)
          setShowSuggestions(true)
          setSelectedSuggestionIndex(-1)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch (error) {
        console.error('Suggestions error:', error)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300) // 300ms debounce

    // Cleanup function
    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Handle click outside to close suggestions (nav bar + hero search are separate DOM trees)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node
      const inNav = navSearchRef.current?.contains(t)
      const inHero = heroSearchRef.current?.contains(t)
      if (!inNav && !inHero) setShowSuggestions(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSearchWithQuery = async (query: string) => {
    if (!query.trim()) {
      return
    }

    setSearchLoading(true)
    setShowSearchResults(true)
    setShowSuggestions(false)
    try {
      const response = await apiRequest(API_ENDPOINTS.search(query))
      const data = await response.json()
      
      if (response.ok) {
        setSearchResults(flattenSearchResults(data))
      } else {
        setSearchResults([])
        console.error('Search error:', data.error)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearch = async () => {
    handleSearchWithQuery(searchQuery)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (showSuggestions && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        // Select the highlighted suggestion
        const selectedSuggestion = suggestions[selectedSuggestionIndex]
        const searchTerm = selectedSuggestion.documentNumber || 
                          selectedSuggestion.description || 
                          selectedSuggestion.lostLocation || 
                          selectedSuggestion.foundLocation || 
                          searchQuery
        setSearchQuery(searchTerm)
        setShowSuggestions(false)
        // Perform search with the selected suggestion
        handleSearchWithQuery(searchTerm)
      } else if (!searchLoading) {
      handleSearch()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions) {
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  const handleSuggestionClick = (suggestion: any) => {
    // Use document number, description, or location for the search query
    const searchTerm = suggestion.documentNumber || 
                      suggestion.description || 
                      suggestion.lostLocation || 
                      suggestion.foundLocation || 
                      searchQuery
    setSearchQuery(searchTerm)
    setShowSuggestions(false)
    handleSearchWithQuery(searchTerm)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    try {
      const response = await apiRequest(API_ENDPOINTS.login, {
        method: 'POST',
        body: JSON.stringify(loginFormData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to login',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Logged in successfully',
      })

      setLoginModalOpen(false)
      setLoginFormData({ email: '', password: '' })
      // Full navigation so the dashboard server layout sees the new auth cookie.
      window.location.href = dashboardPathForStaffRole(data.user?.role ?? '')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoginLoading(false)
    }
  }

  // Fetch all documents for count calculations
  useEffect(() => {
    const fetchAllForCounts = async () => {
      try {
        const response = await apiRequest(API_ENDPOINTS.latestDocuments(1000))
        if (response.ok) {
          const data = await response.json()
          setAllDocumentsForCounts(data.documents || [])
        }
      } catch (error) {
        console.error('Error fetching documents for counts:', error)
      }
    }
    fetchAllForCounts()
  }, [])

  const filterCounts = getDocumentViewCounts(allDocumentsForCounts)

  const documentViewFilters: {
    id: DocumentViewType
    label: string
    count?: number
    icon?: typeof AlertCircle
    iconInactiveClassName?: string
  }[] = [
    { id: 'all', label: 'All Items', count: filterCounts.all },
    { id: 'available', label: 'At station', count: filterCounts.available, icon: CheckCircle },
    { id: 'claimed', label: 'Claimed', count: filterCounts.claimed, icon: AlertCircle },
    { id: 'collected', label: 'Collected', count: filterCounts.collected, icon: Heart },
    { id: 'urgent', label: 'Urgent', count: filterCounts.urgent, icon: AlertTriangle, iconInactiveClassName: 'text-orange-500' },
  ]

  const openClaimModal = (doc: ClaimableDocument) => {
    if (doc.status === 'HANDED_OVER') {
      toast({
        title: 'Not available',
        description: 'This document has already been collected.',
      })
      return
    }
    setClaimDocument(doc)
    setClaimModalOpen(true)
  }

  const handleDocumentViewChange = (view: DocumentViewType) => {
    setDocumentViewType(view)
    setShowSearchResults(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const filterDocumentsForDisplay = (documents: typeof latestDocuments) =>
    applyCategoryFilter(
      applyDocumentViewFilter(documents, documentViewType),
      selectedCategory
    )

  const filterTabButtonClass = (isActive: boolean) =>
    cn(
      'h-10 sm:h-11 px-4 sm:px-5 rounded-full flex-shrink-0 text-xs sm:text-sm transition-colors inline-flex items-center gap-1.5',
      'border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
      isActive
        ? 'bg-blue-900 text-white font-semibold hover:bg-blue-900 hover:text-white'
        : 'bg-gray-100 text-gray-700 font-medium hover:bg-gray-200'
    )

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Urgent Announcement Banner */}
      {urgentDocuments.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-1.5 px-2 sm:py-3 sm:px-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              <AlertCircle className="h-3 w-3 sm:h-5 sm:w-5 animate-pulse flex-shrink-0" />
              <div className="flex-1 text-center">
                {urgentDocuments.map((doc, index) => (
                  <div key={doc.id} className={index > 0 ? 'mt-1 pt-1 sm:mt-2 sm:pt-2 border-t border-white/20' : ''}>
                    {doc.urgentMessage ? (
                      <p className="text-[10px] sm:text-sm font-semibold line-clamp-1">
                        {doc.urgentMessage}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-sm font-semibold line-clamp-1">
                        🚨 URGENT: Found {doc.documentNumber 
                          ? (
                            <>
                              <span className="font-bold not-italic">{doc.documentType?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT'}:</span>
                              <span className="font-normal italic"> {doc.documentNumber}</span>
                            </>
                          )
                          : doc.documentType?.replace(/_/g, ' ') || 'Document'}
                        {doc.lostLocation || doc.foundLocation ? ` in ${doc.lostLocation || doc.foundLocation}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar — traffic-sign header */}
      <nav className="traffic-header fixed left-0 right-0 z-50">
        <div className="traffic-header-stripes" aria-hidden="true" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 traffic-header-body">
          <div className="flex h-12 items-center gap-2 sm:h-20 sm:gap-3 lg:gap-4">
            {/* Logo — left */}
            <Link href="/" className="group flex flex-shrink-0 items-center">
              <div className="flex flex-col">
                <span className="text-base sm:text-3xl font-bold text-white tracking-tight group-hover:opacity-90 transition-opacity">Subizwa</span>
                <span className="text-xs text-gold-400 font-semibold hidden sm:block uppercase tracking-wide">Found documents recovery</span>
              </div>
            </Link>

            {/* Desktop search — grows toward staff / login controls */}
            <div className="relative hidden min-w-0 flex-1 lg:flex lg:pl-1 lg:pr-2" ref={navSearchRef}>
              <div className="w-full bg-white border border-gray-300 rounded-[1.5rem] transition-all duration-200 text-blue-900">
                <div className="flex items-center gap-0 p-1.5">
                  {/* Search Input */}
                  <div className="relative flex-1 flex items-center min-w-0">
                    <Search className="absolute left-3 h-4 w-4 text-blue-900/45 z-10" />
                    <Input
                      type="text"
                      placeholder="Search items, documents, locations..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setShowSearchResults(false)
                        setShowSuggestions(true)
                      }}
                      onKeyDown={handleKeyPress}
                      onFocus={() => {
                        if (suggestions.length > 0) {
                          setShowSuggestions(true)
                        }
                      }}
                      className="flex-1 h-10 pl-10 pr-3 text-sm text-blue-900 placeholder:text-blue-900/45 border-0 focus-visible:ring-0 focus-visible:outline-none bg-transparent"
                    />
                  </div>

                  {/* Divider */}
                  <div className="h-6 w-px bg-gray-200 mx-1" />

                  {/* Location Filter */}
                  <div className="flex items-center">
                    <Select>
                      <SelectTrigger className="w-[140px] h-8 border-0 shadow-none outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 data-[state=open]:border-0 text-xs font-semibold text-blue-900 bg-transparent hover:opacity-80 rounded-lg [&_svg]:text-blue-900">
                        <div className="flex items-center gap-1.5 text-blue-900">
                          <MapPin className="h-3.5 w-3.5 text-blue-900 flex-shrink-0" />
                          <SelectValue placeholder="Location" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="kigali">Kigali</SelectItem>
                        <SelectItem value="kimironko">Kimironko</SelectItem>
                        <SelectItem value="cbd">CBD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Divider */}
                  <div className="h-6 w-px bg-gray-200 mx-1" />

                  {/* Category Filter */}
                  <div className="flex items-center">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[160px] h-8 border-0 shadow-none outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 data-[state=open]:border-0 text-xs font-semibold text-blue-900 bg-transparent hover:opacity-80 rounded-lg [&_svg]:text-blue-900">
                        <div className="flex items-center gap-1.5 text-blue-900">
                          <Filter className="h-3.5 w-3.5 text-blue-900 flex-shrink-0" />
                          <SelectValue placeholder="Category" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="ID_CARD">ID Card</SelectItem>
                        <SelectItem value="PASSPORT">Passport</SelectItem>
                        <SelectItem value="ATM_CARD">ATM Card</SelectItem>
                        <SelectItem value="STUDENT_CARD">Student Card</SelectItem>
                        <SelectItem value="DRIVERS_LICENSE">Driver's License</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Divider */}
                  <div className="h-6 w-px bg-gray-200 mx-1" />

                  {/* Search Button */}
                  <Button 
                    className="h-10 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-[1.25rem] text-xs font-medium transition-all duration-200 ml-1.5"
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    type="button"
                  >
                    {searchLoading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-1.5" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Desktop Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] z-50 max-h-96 overflow-y-auto border border-gray-100 text-blue-900">
                  {suggestionsLoading ? (
                    <div className="p-4 text-center">
                      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-blue-900/60 mt-2">Searching...</p>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <ul className="py-2">
                      {suggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion.type}-${suggestion.id}-${index}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                          }`}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          <div className="flex items-start gap-3">
                            {suggestion.type === 'lost' ? (
                              <FileQuestion className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <FileCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  suggestion.type === 'lost' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  At station
                                </span>
                                <span className="text-sm font-medium text-blue-900">
                                  {suggestion.documentType?.replace(/_/g, ' ') || 'Document'}
                                </span>
                              </div>
                              {suggestion.description && (
                                <p className="text-sm text-blue-900/70 line-clamp-1">
                                  {suggestion.description}
                                </p>
                              )}
                              {(suggestion.lostLocation || suggestion.foundLocation) && (
                                <div className="flex items-center gap-1 text-xs text-blue-900/60 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{suggestion.lostLocation || suggestion.foundLocation}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-sm text-blue-900/60">
                      No suggestions found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Staff login & report actions — right */}
            <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
              {/* Mobile Actions */}
              <div className="flex items-center gap-2 sm:hidden">
                <Button
                  variant="outline"
                  type="button"
                  className="h-9 px-2.5 rounded-full border-gray-300 text-gray-800 bg-white hover:bg-gray-100 text-xs font-medium flex items-center gap-1"
                  onClick={() => {
                    setLoginModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Staff</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0 rounded-full border-gray-300 text-gray-700 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Desktop / Tablet Actions */}
              <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  type="button"
                  className="h-9 sm:h-11 px-3 sm:px-4 rounded-full border-slate-300 text-slate-800 bg-white hover:bg-slate-50 font-medium flex items-center gap-2"
                  onClick={() => {
                    setLoginModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Staff login</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-blue-900/25 bg-white/95 py-4 animate-in slide-in-from-top duration-200">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="mx-4 h-11 rounded-full border-slate-300 text-slate-800"
                  onClick={() => {
                    setLoginModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2 inline" />
                  Staff login (admin, officer, institution)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Alert bar — text link, not a button */}
        <div className="border-t border-white/15 bg-[#081a30]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-center">
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              <span className="text-gold-400/95">Document not listed yet?</span>{' '}
              <button
                type="button"
                onClick={() => setWatchModalOpen(true)}
                className="text-white font-medium underline underline-offset-2 decoration-white/50 hover:decoration-gold-400 hover:text-gold-400 transition-colors bg-transparent border-0 p-0 cursor-pointer inline"
              >
                Register your details — we will email you when it is found
              </button>
            </p>
          </div>
        </div>

        <div className="traffic-header-foot" aria-hidden="true" />
      </nav>

      {/* Header with Search Section */}
      <section className="bg-white container mx-auto px-2 sm:px-6 lg:px-8 pt-28 sm:pt-40 pb-6 sm:pb-8 overflow-x-hidden">

        {/* Top horizontal banners — max 2, below header */}
        <AdBannerTopRow ads={bannerAds} loading={adsLoading} className="mb-4 sm:mb-6 max-w-6xl mx-auto" />

        {/* Search Section - Item-Focused */}
        <div className="space-y-4 overflow-x-hidden">
          {/* Main Search Bar with Integrated Filters */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl" ref={heroSearchRef}>
              {/* Mobile: All-in-one Searchbar */}
              <div className="md:hidden relative">
                <div className="bg-white border border-gray-300 rounded-[2rem] transition-all duration-200 p-1.5 text-blue-900">
                  <div className="flex items-center gap-1">
                    {/* Search Input */}
                    <div className="relative flex-1 flex items-center min-w-0">
                      <Search className="absolute left-2 h-3.5 w-3.5 text-blue-900/45 z-10" />
              <Input
                type="text"
                        placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchResults(false)
                          setShowSuggestions(true)
                        }}
                        onKeyDown={handleKeyPress}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true)
                          }
                        }}
                        className="flex-1 h-9 pl-8 pr-1.5 text-xs text-blue-900 placeholder:text-blue-900/45 border-0 focus-visible:ring-0 focus-visible:outline-none bg-transparent"
                      />
                    </div>
                    
                    {/* Divider */}
                    <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
                    
                    {/* Location Filter */}
                    <Select>
                      <SelectTrigger className="w-[78px] h-9 border-0 shadow-none outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 data-[state=open]:border-0 text-[10px] font-semibold text-blue-900 bg-transparent hover:opacity-80 rounded-lg px-1 flex-shrink-0 [&_svg]:text-blue-900">
                        <div className="flex items-center gap-0.5 text-blue-900">
                          <MapPin className="h-3 w-3 text-blue-900 flex-shrink-0" />
                          <SelectValue placeholder="Loc" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="kigali">Kigali</SelectItem>
                        <SelectItem value="kimironko">Kimironko</SelectItem>
                        <SelectItem value="cbd">CBD</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Divider */}
                    <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
                    
                    {/* Category Filter */}
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[82px] h-9 border-0 shadow-none outline-none focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 data-[state=open]:border-0 text-[10px] font-semibold text-blue-900 bg-transparent hover:opacity-80 rounded-lg px-1 flex-shrink-0 [&_svg]:text-blue-900">
                        <div className="flex items-center gap-0.5 text-blue-900">
                          <Filter className="h-3 w-3 text-blue-900 flex-shrink-0" />
                          <SelectValue placeholder="Cat" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="ID_CARD">ID Card</SelectItem>
                        <SelectItem value="PASSPORT">Passport</SelectItem>
                        <SelectItem value="ATM_CARD">ATM Card</SelectItem>
                        <SelectItem value="STUDENT_CARD">Student Card</SelectItem>
                        <SelectItem value="DRIVERS_LICENSE">Driver's License</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Divider */}
                    <div className="h-5 w-px bg-gray-200 flex-shrink-0" />

              {/* Search Button */}
                <Button 
                      className="h-9 w-9 p-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full transition-all duration-200 flex-shrink-0"
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  type="button"
                >
                  {searchLoading ? (
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                        <Search className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
              
              {/* Mobile Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim() && (
                <div className="md:hidden absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] z-50 max-h-96 overflow-y-auto border border-gray-100 text-blue-900">
                    {suggestionsLoading ? (
                      <div className="p-4 text-center">
                        <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-blue-900/60 mt-2">Searching...</p>
            </div>
                    ) : suggestions.length > 0 ? (
                      <ul className="py-2">
                        {suggestions.map((suggestion, index) => (
                          <li
                            key={`${suggestion.type}-${suggestion.id}-${index}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                            }`}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                          >
                            <div className="flex items-start gap-3">
                              {suggestion.type === 'lost' ? (
                                <FileQuestion className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <FileCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    suggestion.type === 'lost' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    At station
                                  </span>
                                  <span className="text-sm font-medium text-blue-900">
                                    {suggestion.documentType?.replace(/_/g, ' ') || 'Document'}
                                  </span>
                                </div>
                                {suggestion.description && (
                                  <p className="text-sm text-blue-900/70 line-clamp-1">
                                    {suggestion.description}
                                  </p>
                                )}
                                {(suggestion.lostLocation || suggestion.foundLocation) && (
                                  <div className="flex items-center gap-1 text-xs text-blue-900/60 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{suggestion.lostLocation || suggestion.foundLocation}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-sm text-blue-900/60">
                        No suggestions found
                      </div>
                    )}
                  </div>
                )}
          </div>

              </div>
          </div>

        </div>
      </section>

      {/* Main Content Section */}
      <section className="bg-white container mx-auto px-2 sm:px-6 lg:px-8 pb-24 md:pb-16 overflow-x-hidden">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            {/* Status Filter Tabs */}
            <div className="mb-4 sm:mb-6">
              <div 
                ref={tabsContainerRef}
                className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0"
                onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
                onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
                onTouchEnd={() => {
                  if (touchStart === null || touchEnd === null) return

                  const distance = touchStart - touchEnd
                  const threshold = 40

                  if (Math.abs(distance) >= threshold) {
                    const order: DocumentViewType[] = [
                      'all',
                      'available',
                      'claimed',
                      'collected',
                      'urgent',
                    ]
                    const currentIndex = order.indexOf(documentViewType)

                    if (distance > 0 && currentIndex < order.length - 1) {
                      // Swipe left → next tab
                      setDocumentViewType(order[currentIndex + 1])
                    } else if (distance < 0 && currentIndex > 0) {
                      // Swipe right → previous tab
                      setDocumentViewType(order[currentIndex - 1])
                    }
                  }

                  setTouchStart(null)
                  setTouchEnd(null)
                }}
              >
                {documentViewFilters.map((filter) => {
                  const isActive = documentViewType === filter.id
                  const Icon = filter.icon
                  return (
                    <Button
                      key={filter.id}
                      type="button"
                      variant="ghost"
                      className={filterTabButtonClass(isActive)}
                      onClick={() => handleDocumentViewChange(filter.id)}
                    >
                      {Icon ? (
                        <Icon
                          className={cn(
                            'h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0',
                            isActive ? 'text-white' : filter.iconInactiveClassName ?? 'text-gray-500'
                          )}
                        />
                      ) : null}
                      <span>
                        {filter.label}
                        {filter.count !== undefined ? ` (${filter.count})` : ''}
                      </span>
                    </Button>
                  )
                })}
                  </div>
            </div>

            {/* Items Grid */}
            <div className="bg-white rounded-lg sm:rounded-2xl overflow-hidden">
              <div className="p-3 sm:p-6">
                    {showSearchResults && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Search Results ({searchResults.length})
                    </h2>
                      <Button 
                        size="sm" 
                        variant="outline" 
                      className="h-9 px-4 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl w-full sm:w-auto"
                        onClick={() => {
                          setShowSearchResults(false)
                          setSearchQuery('')
                          setSearchResults([])
                        }}
                      >
                      <X className="h-4 w-4 mr-2" />
                        Clear Search
                    </Button>
                  </div>
                )}

                {(documentsLoading || searchLoading) ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : showSearchResults ? (
                  (() => {
                    const filteredSearchResults = filterDocumentsForDisplay(searchResults)

                    if (filteredSearchResults.length === 0) {
                      return (
                    <div className="text-center py-12 px-4">
                      <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No documents found</p>
                          <p className="text-sm text-gray-400 mt-2">
                            Try a different search or{' '}
                            <button
                              type="button"
                              onClick={() => setWatchModalOpen(true)}
                              className="text-blue-900 font-medium underline underline-offset-2 hover:text-blue-700 bg-transparent border-0 p-0 cursor-pointer inline"
                            >
                              register an email alert
                            </button>
                          </p>
                    </div>
                      )
                    }
                    
                    return (
                    <div className="space-y-0">
                      {filteredSearchResults.map((doc, index) => (
                        <div key={`${doc.type}-${doc.id}`} className={index < filteredSearchResults.length - 1 ? 'border-b border-dashed border-gray-200' : ''}>
                          {/* Lost & Found Item Card - List Mode */}
                          <div className="bg-white rounded-lg overflow-hidden hover:shadow-sm transition-all duration-200">
                            <div className="flex gap-3 p-2.5">
                              {/* Image Section - Left */}
                              <div className="flex-shrink-0">
                                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => {
                                  e.stopPropagation()
                                  if (doc.type === 'found' && doc.image) {
                                    setViewingImage({ url: doc.image, alt: doc.documentNumber || 'Document' })
                                  }
                                }}>
                                  {doc.type === 'found' && doc.image ? (
                                    <img 
                                      src={doc.image} 
                                      alt="Item" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <FileQuestion className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Details Section - Right */}
                              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                      FOUND
                                    </span>
                                    {doc.status === 'CLAIM_PENDING' && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                        Open for claims
                                      </span>
                                    )}
                                    {doc.status === 'HANDED_OVER' && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                        Collected
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-sm line-clamp-1 text-gray-900">
                                    {doc.documentNumber 
                                      ? (
                                        <>
                                          <span className="font-bold not-italic">{doc.documentType?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT'}:</span>
                                          <span className="font-normal italic"> {doc.documentNumber}</span>
                                        </>
                                      )
                                      : <span className="font-semibold">{doc.documentType?.replace(/_/g, ' ') || 'Document'}</span>}
                                  </h3>
                                  {doc.station?.name && (
                                    <p className="text-xs text-blue-900/80 mt-0.5 line-clamp-1">
                                      <Building2 className="h-3 w-3 inline mr-0.5" />
                                      {doc.station.name}
                                    </p>
                                  )}
                                  {/* Mobile: Show location and date below title */}
                                  <div className="sm:hidden flex flex-wrap items-center gap-2 mt-1">
                                    {(doc.lostLocation || doc.foundLocation) && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <MapPin className="h-3 w-3 text-gray-400" />
                                        <span className="line-clamp-1">{doc.lostLocation || doc.foundLocation}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      <span className="line-clamp-1">
                                        {new Date(doc.reportDate || doc.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Right side: Location, Date, and Action Button - Desktop only */}
                                <div className="hidden sm:flex items-center gap-2 lg:gap-3 flex-shrink-0">
                                  {(doc.lostLocation || doc.foundLocation) && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                                      <MapPin className="h-3 w-3 text-gray-400" />
                                      <span className="hidden lg:inline">{doc.lostLocation || doc.foundLocation}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    <span className="hidden lg:inline">
                                      Found on {new Date(doc.reportDate || doc.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                    <Button 
                      size="sm" 
                                    className="h-7 text-xs font-medium rounded-full whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openClaimModal({
                                        id: doc.id,
                                        documentType: doc.documentType,
                                        documentNumber: doc.documentNumber,
                                        foundLocation: doc.foundLocation,
                                        station: doc.station,
                                        status: doc.status,
                                      })
                                    }}
                                  >
                                        <CheckCircle className="h-3 w-3 sm:mr-1" />
                                        <span className="hidden sm:inline">Claim</span>
                    </Button>
                    <Button 
                      variant="outline" 
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-md border flex-shrink-0"
                                    onClick={(e) => toggleDocumentDropdown(doc, e)}
                                  >
                                    {openDropdownId === `${doc.type}-${doc.id}` ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                    </Button>
                  </div>
                                  {/* Mobile: Action buttons row */}
                                  <div className="sm:hidden flex items-center gap-2">
                    <Button 
                      size="sm" 
                                    className="flex-1 h-8 text-xs font-medium rounded-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openClaimModal({
                                        id: doc.id,
                                        documentType: doc.documentType,
                                        documentNumber: doc.documentNumber,
                                        foundLocation: doc.foundLocation,
                                        station: doc.station,
                                        status: doc.status,
                                      })
                                    }}
                                  >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Claim
                    </Button>
                    <Button 
                      variant="outline" 
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-md border flex-shrink-0"
                                    onClick={(e) => toggleDocumentDropdown(doc, e)}
                                  >
                                    {openDropdownId === `${doc.type}-${doc.id}` ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                    </Button>
                  </div>
                </div>
                  </div>
                    </div>
                          {/* Expanded Details */}
                          {openDropdownId === `${doc.type}-${doc.id}` && (
                            <div
                              ref={(el) => {
                                dropdownRefs.current[`${doc.type}-${doc.id}`] = el
                              }}
                              className="mt-2 bg-white rounded-b-lg border border-dashed border-gray-300"
                            >
                              {dropdownLoading[`${doc.type}-${doc.id}`] ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              ) : dropdownDetails[`${doc.type}-${doc.id}`] ? (
                                <div className="p-4 sm:p-6">
                                  <div className="flex flex-col gap-4 sm:gap-6 items-start">
                                    {/* Details */}
                                    <div className="flex-1 space-y-4 w-full">
                                            <div className="flex items-center justify-between">
                                              <h3 className="font-semibold text-lg">
                                                {dropdownDetails[`${doc.type}-${doc.id}`].document.documentType?.replace(/_/g, ' ') || 'Document'}
                                              </h3>
                                              <span className={`text-xs px-2 py-1 rounded-full ${
                                                dropdownDetails[`${doc.type}-${doc.id}`].document.type === 'lost' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                                {dropdownDetails[`${doc.type}-${doc.id}`].document.type === 'lost' ? 'Missing' : 'Recovered'}
                                  </span>
                                </div>
                                            {dropdownDetails[`${doc.type}-${doc.id}`].document.documentNumber && (
                                              <div className="flex items-start gap-2">
                                                <Hash className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <div>
                                                  <p className="text-xs font-medium text-gray-500">Document Number</p>
                                                  <p className="text-sm text-gray-900">
                                                    <span className="font-bold not-italic">{dropdownDetails[`${doc.type}-${doc.id}`].document.documentType?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT'}:</span>
                                                    <span className="font-normal italic"> {dropdownDetails[`${doc.type}-${doc.id}`].document.documentNumber}</span>
                                                  </p>
                                                </div>
                                              </div>
                                            )}
                                            {(dropdownDetails[`${doc.type}-${doc.id}`].document.lostLocation || dropdownDetails[`${doc.type}-${doc.id}`].document.foundLocation) && (
                                              <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <div>
                                                  <p className="text-xs font-medium text-gray-500">Location</p>
                                                  <p className="text-sm text-gray-900">{dropdownDetails[`${doc.type}-${doc.id}`].document.lostLocation || dropdownDetails[`${doc.type}-${doc.id}`].document.foundLocation}</p>
                                                </div>
                                  </div>
                                )}
                                            {dropdownDetails[`${doc.type}-${doc.id}`].document.description && (
                                              <div className="flex items-start gap-2">
                                                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <div>
                                                  <p className="text-xs font-medium text-gray-500">Description</p>
                                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{dropdownDetails[`${doc.type}-${doc.id}`].document.description}</p>
                                                </div>
                                              </div>
                                            )}
                                            {dropdownDetails[`${doc.type}-${doc.id}`].document.user && (
                                              <>
                                                {dropdownDetails[`${doc.type}-${doc.id}`].document.user.name && (
                                                  <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                      <p className="text-xs font-medium text-gray-500">Reported By</p>
                                                      <p className="text-sm text-gray-900">{dropdownDetails[`${doc.type}-${doc.id}`].document.user.name}</p>
                                                    </div>
                                                  </div>
                                                )}
                                                {dropdownDetails[`${doc.type}-${doc.id}`].document.user.email && (
                                                  <div className="flex items-start gap-2">
                                                    <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                      <p className="text-xs font-medium text-gray-500">Email</p>
                                                      <a href={`mailto:${dropdownDetails[`${doc.type}-${doc.id}`].document.user.email}`} className="text-sm text-blue-600 hover:underline">
                                                        {dropdownDetails[`${doc.type}-${doc.id}`].document.user.email}
                                                      </a>
                                                    </div>
                                                  </div>
                                                )}
                                                {dropdownDetails[`${doc.type}-${doc.id}`].document.user.phone && (
                                                  <div className="flex items-start gap-2">
                                                    <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                      <p className="text-xs font-medium text-gray-500">Phone</p>
                                                      <a href={`tel:${dropdownDetails[`${doc.type}-${doc.id}`].document.user.phone}`} className="text-sm text-blue-600 hover:underline">
                                                        {dropdownDetails[`${doc.type}-${doc.id}`].document.user.phone}
                                                      </a>
                                                    </div>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                  </div>
                                ) : null}
                                  </div>
                                )}
                        </div>
                      ))}
                    </div>
                  )
                  })()
                ) : latestDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No documents found yet</p>
                    <p className="text-sm text-gray-400 mt-2">Be the first to report a missing or recovered document</p>
                  </div>
                ) : (() => {
                  const filteredDocuments = filterDocumentsForDisplay(latestDocuments)

                  if (filteredDocuments.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {documentViewType === 'all'
                            ? 'No documents found yet'
                            : getEmptyFilterMessage(documentViewType)}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          {documentViewType === 'all'
                            ? 'Be the first to report a missing or recovered document'
                            : 'Try another filter or category'}
                        </p>
                              </div>
                    )
                  }
                  
                  return (
                  <div className="space-y-0">
                    {filteredDocuments.map((doc, index) => (
                      <div key={`${doc.type}-${doc.id}`} className={index < filteredDocuments.length - 1 ? 'border-b border-dashed border-gray-200' : ''}>
                        {/* Lost & Found Item Card - List Mode */}
                        <div className="bg-white rounded-lg overflow-hidden hover:shadow-sm transition-all duration-200">
                          <div className="flex gap-2 sm:gap-3 p-2 sm:p-2.5 relative">
                            {/* Image Section - Left */}
                            <div className="flex-shrink-0">
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => {
                                e.stopPropagation()
                                if (doc.type === 'found' && doc.image) {
                                  setViewingImage({ url: doc.image, alt: doc.documentNumber || 'Document' })
                                }
                              }}>
                              {doc.type === 'found' && doc.image ? (
                                <img 
                                  src={doc.image} 
                                    alt="Item" 
                                    className="w-full h-full object-cover"
                                />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileQuestion className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                                </div>
                              )}
                              </div>
                            </div>

                            {/* Details Section - Right */}
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Mobile: Action Buttons at Top Right */}
                                <div className="sm:hidden absolute top-2 right-2 flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    className="h-6 text-[10px] font-medium rounded-full whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openClaimModal({
                                        id: doc.id,
                                        documentType: doc.documentType,
                                        documentNumber: doc.documentNumber,
                                        foundLocation: doc.foundLocation,
                                        station: doc.station,
                                        status: doc.status,
                                      })
                                    }}
                                  >
                                      <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-full border flex-shrink-0"
                                    onClick={(e) => toggleDocumentDropdown(doc, e)}
                                  >
                                    {openDropdownId === `${doc.type}-${doc.id}` ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap pr-14 sm:pr-0">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                    FOUND
                                </span>
                                  {doc.status === 'CLAIM_PENDING' && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                      Open for claims
                                    </span>
                                  )}
                                  {doc.status === 'HANDED_OVER' && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                      Collected
                                    </span>
                                  )}
                              </div>
                                <h3 className="text-sm line-clamp-1 pr-14 sm:pr-0 text-gray-900">
                                  {doc.documentNumber 
                                    ? (
                                      <>
                                        <span className="font-bold not-italic">{doc.documentType?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT'}:</span>
                                        <span className="font-normal italic"> {doc.documentNumber}</span>
                                      </>
                                    )
                                    : <span className="font-semibold">{doc.documentType?.replace(/_/g, ' ') || 'Document'}</span>}
                                </h3>
                                {doc.station?.name && (
                                  <p className="text-xs text-blue-900/80 mt-0.5 line-clamp-1 pr-14 sm:pr-0">
                                    <Building2 className="h-3 w-3 inline mr-0.5" />
                                    {doc.station.name}
                                  </p>
                                )}
                                {/* Mobile: Location and Date on same line */}
                                <div className="sm:hidden flex items-center gap-2 mt-1 flex-wrap">
                                  {(doc.lostLocation || doc.foundLocation) && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <MapPin className="h-3 w-3 text-gray-400" />
                                      <span className="truncate max-w-[120px]">{doc.lostLocation || doc.foundLocation}</span>
                                </div>
                              )}
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    <span className="whitespace-nowrap">
                                      {new Date(doc.reportDate || doc.createdAt).toLocaleDateString()}
                                    </span>
                              </div>
                                </div>
                              </div>
                              
                              {/* Right side: Location, Date (Desktop), and Action Buttons */}
                              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                                {/* Desktop: Location and Date */}
                                <div className="flex items-center gap-3">
                              {(doc.lostLocation || doc.foundLocation) && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                                      <MapPin className="h-3 w-3 text-gray-400" />
                                      <span className="max-w-[100px] truncate">{doc.lostLocation || doc.foundLocation}</span>
                                </div>
                              )}
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    <span>
                                      {new Date(doc.reportDate || doc.createdAt).toLocaleDateString()}
                              </span>
                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-medium rounded-full whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openClaimModal({
                                      id: doc.id,
                                      documentType: doc.documentType,
                                      documentNumber: doc.documentNumber,
                                      foundLocation: doc.foundLocation,
                                      station: doc.station,
                                      status: doc.status,
                                    })
                                  }}
                                >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Claim
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full border flex-shrink-0"
                                  onClick={(e) => toggleDocumentDropdown(doc, e)}
                                >
                                  {openDropdownId === `${doc.type}-${doc.id}` ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
              </div>
                            </div>
                          </div>
          </div>

                        {/* Expanded Details */}
                        {openDropdownId === `${doc.type}-${doc.id}` && (
                          <div
                            ref={(el) => {
                              dropdownRefs.current[`${doc.type}-${doc.id}`] = el
                            }}
                            className="bg-white border border-dashed border-gray-300"
                          >
                            {dropdownLoading[`${doc.type}-${doc.id}`] ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                            ) : dropdownDetails[`${doc.type}-${doc.id}`] ? (
                              <div className="p-6">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                  {/* Details */}
                                  <div className="flex-1 space-y-4 w-full">
                                          <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-lg">
                                              {dropdownDetails[`${doc.type}-${doc.id}`].document.documentType?.replace(/_/g, ' ') || 'Document'}
                                            </h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                              dropdownDetails[`${doc.type}-${doc.id}`].document.type === 'lost' 
                                                ? 'bg-orange-100 text-orange-700' 
                                                : 'bg-green-100 text-green-700'
                                            }`}>
                                              {dropdownDetails[`${doc.type}-${doc.id}`].document.type === 'lost' ? 'Missing' : 'Recovered'}
                                            </span>
                  </div>
                                          {dropdownDetails[`${doc.type}-${doc.id}`].document.documentNumber && (
                                            <div className="flex items-start gap-2">
                                              <Hash className="h-4 w-4 text-gray-400 mt-0.5" />
                                              <div>
                                                <p className="text-xs font-medium text-gray-500">Document Number</p>
                                                <p className="text-sm text-gray-900">
                                                  <span className="font-bold not-italic">{dropdownDetails[`${doc.type}-${doc.id}`].document.documentType?.replace(/_/g, ' ').toUpperCase() || 'DOCUMENT'}:</span>
                                                  <span className="font-normal italic"> {dropdownDetails[`${doc.type}-${doc.id}`].document.documentNumber}</span>
                                                </p>
                            </div>
                            </div>
                            )}
                                          {(dropdownDetails[`${doc.type}-${doc.id}`].document.lostLocation || dropdownDetails[`${doc.type}-${doc.id}`].document.foundLocation) && (
                                            <div className="flex items-start gap-2">
                                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                              <div>
                                                <p className="text-xs font-medium text-gray-500">Location</p>
                                                <p className="text-sm text-gray-900">{dropdownDetails[`${doc.type}-${doc.id}`].document.lostLocation || dropdownDetails[`${doc.type}-${doc.id}`].document.foundLocation}</p>
                          </div>
                              </div>
                            )}
                                          {dropdownDetails[`${doc.type}-${doc.id}`].document.description && (
                                            <div className="flex items-start gap-2">
                                              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                                              <div>
                                                <p className="text-xs font-medium text-gray-500">Description</p>
                                                <p className="text-sm text-gray-900 whitespace-pre-wrap">{dropdownDetails[`${doc.type}-${doc.id}`].document.description}</p>
                          </div>
                                            </div>
                                          )}
                                          {dropdownDetails[`${doc.type}-${doc.id}`].document.user && (
                                            <>
                                              {dropdownDetails[`${doc.type}-${doc.id}`].document.user.name && (
                                                <div className="flex items-start gap-2">
                                                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-500">Reported By</p>
                                                    <p className="text-sm text-gray-900">{dropdownDetails[`${doc.type}-${doc.id}`].document.user.name}</p>
                                                  </div>
                                                </div>
                                              )}
                                              {dropdownDetails[`${doc.type}-${doc.id}`].document.user.email && (
                                                <div className="flex items-start gap-2">
                                                  <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-500">Email</p>
                                                    <a href={`mailto:${dropdownDetails[`${doc.type}-${doc.id}`].document.user.email}`} className="text-sm text-blue-600 hover:underline">
                                                      {dropdownDetails[`${doc.type}-${doc.id}`].document.user.email}
                                                    </a>
                                                  </div>
                                                </div>
                                              )}
                                              {dropdownDetails[`${doc.type}-${doc.id}`].document.user.phone && (
                                                <div className="flex items-start gap-2">
                                                  <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                                                  <div>
                                                    <p className="text-xs font-medium text-gray-500">Phone</p>
                                                    <a href={`tel:${dropdownDetails[`${doc.type}-${doc.id}`].document.user.phone}`} className="text-sm text-blue-600 hover:underline">
                                                      {dropdownDetails[`${doc.type}-${doc.id}`].document.user.phone}
                                                    </a>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
          </div>
                                ) : null}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Ads (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <AdSidebarStack ads={sidebarAds} loading={adsLoading} />
            </div>
          </div>
        </div>

        {/* Sidebar-placement ads on mobile (below feed) */}
        {sidebarAds.length > 0 ? (
          <div className="lg:hidden mt-8 max-w-2xl mx-auto">
            <AdSidebarStack ads={sidebarAds} loading={adsLoading} />
          </div>
        ) : null}
      </section>

      {/* Login Modal */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="space-y-0">
            <DialogTitle>Staff login</DialogTitle>
            <DialogDescription className="sr-only">
              Sign in as admin, officer, or institution
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={loginFormData.email}
                onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginFormData.password}
                onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-xs text-gray-500">
            Staff accounts are created by your administrator.
          </p>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="sm:max-w-4xl w-[calc(100%-1rem)] max-h-[min(90dvh,calc(100dvh-1rem))] p-0 bg-black/95 overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>View Document Image</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 h-10 w-10 p-0 bg-white/20 hover:bg-white/30 text-white rounded-full z-10"
                onClick={() => setViewingImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <img
                src={viewingImage.url}
                alt={viewingImage.alt}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer — minimal */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Subizwa. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-gray-500 transition-colors hover:text-blue-600">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-gray-500 transition-colors hover:text-blue-600">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      <ClaimDocumentModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
        document={claimDocument}
        onSuccess={() => {
          fetchLatestDocuments()
          apiRequest(API_ENDPOINTS.latestDocuments(1000))
            .then((r) => r.json())
            .then((data) => {
              if (data.documents) setAllDocumentsForCounts(data.documents)
            })
            .catch(() => {})
        }}
      />

      <DocumentWatchModal open={watchModalOpen} onOpenChange={setWatchModalOpen} />

    </div>
  )
}

