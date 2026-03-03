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
import { Shield, Search, CheckCircle, Building2, Calendar, Ticket, Compass, MessageCircle, FileQuestion, FileCheck, MapPin, Clock, Filter, LogIn, User, Mail, Phone, Hash, FileText, ArrowLeft, X, ChevronDown, ChevronUp, AlertCircle, Plus, Heart, Award, AlertTriangle, Navigation, Info, Lock, Users, Eye, Menu } from 'lucide-react'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'
import { ReportFoundModal } from '@/components/ReportFoundModal'
import { ReportLostModal } from '@/components/ReportLostModal'
import { DocumentDetailsModal } from '@/components/DocumentDetailsModal'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [latestDocuments, setLatestDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [reportFoundModalOpen, setReportFoundModalOpen] = useState(false)
  const [reportLostModalOpen, setReportLostModalOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null)
  const [documentDetailsModalOpen, setDocumentDetailsModalOpen] = useState(false)
  const [handoverPoints, setHandoverPoints] = useState<any[]>([])
  const [handoverPointsLoading, setHandoverPointsLoading] = useState(true)
  const [ads, setAds] = useState<any[]>([])
  const [adsLoading, setAdsLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [documentViewType, setDocumentViewType] = useState<'all' | 'lost' | 'found' | 'urgent' | 'reunited' | 'nearby'>('all')
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
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const router = useRouter()
  const { toast } = useToast()
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)


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

  const fetchAds = async () => {
    try {
      setAdsLoading(true)
      const response = await fetch('/api/ads')
      if (response.ok) {
        const data = await response.json()
        setAds(data.ads || [])
      }
    } catch (error) {
      console.error('Error fetching ads:', error)
    } finally {
      setAdsLoading(false)
    }
  }

  const fetchUrgentDocuments = async () => {
    try {
      const response = await fetch('/api/documents/latest?limit=100')
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
      const limitValue = (documentViewType === 'urgent' || documentViewType === 'reunited' || documentViewType === 'nearby') ? '1000' : '50'
      params.append('limit', limitValue)
      
      // Add type filter if not 'all', 'urgent', 'reunited', or 'nearby'
      if (documentViewType !== 'all' && documentViewType !== 'urgent' && documentViewType !== 'reunited' && documentViewType !== 'nearby') {
        params.append('type', documentViewType)
      }
      
      // Add special filter for urgent, reunited, nearby
      if (documentViewType === 'urgent' || documentViewType === 'reunited' || documentViewType === 'nearby') {
        params.append('filter', documentViewType)
      }
      
      // Add category filter if not 'all'
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      // Call Next.js API route directly
      const response = await fetch(`/api/documents/latest?${params.toString()}`)
        const data = await response.json()
      
      // Check if there's an error in the response (even if status is 200)
      if (data.error || !response.ok) {
        console.error('API Error:', data.error, data.details)
        toast({
          title: 'Database Connection Error',
          description: data.details || data.error || 'Failed to connect to database. Please check your MongoDB connection string in the .env file.',
          variant: 'destructive',
        })
        setLatestDocuments([])
        return
      }
      
      let documents = data.documents || []
      
      // Filters are now applied at the API level, but we can do additional client-side filtering if needed
      // The API already handles urgent, reunited, and nearby filters
      
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
      const response = await fetch(`/api/documents/${doc.id}?type=${doc.type}`)
      
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

  // Fetch ads only once on component mount - ads don't change frequently
  useEffect(() => {
    const loadAds = async () => {
      try {
        setAdsLoading(true)
        const response = await fetch('/api/ads')
        if (response.ok) {
          const data = await response.json()
          setAds(data.ads || [])
        }
      } catch (error) {
        console.error('Error fetching ads:', error)
      } finally {
        setAdsLoading(false)
      }
    }
    loadAds()
  }, []) // Empty dependency array - only runs once on mount

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
          // Combine lost and found results for suggestions (limit to 5 each)
          const allSuggestions = [
            ...(data.results?.lostReports || []).slice(0, 5).map((r: any) => ({ 
              ...r, 
              type: 'lost', 
              reportDate: r.lostDate || r.createdAt,
              displayText: `${r.documentType?.replace(/_/g, ' ') || 'Document'} - ${r.description || r.lostLocation || ''}`.substring(0, 60)
            })),
            ...(data.results?.foundReports || []).slice(0, 5).map((r: any) => ({ 
              ...r, 
              type: 'found', 
              reportDate: r.foundDate || r.createdAt,
              displayText: `${r.documentType?.replace(/_/g, ' ') || 'Document'} - ${r.description || r.foundLocation || ''}`.substring(0, 60)
            })),
          ]
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

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Refresh documents when modals close (in case new documents were added)
  const prevFoundModalOpen = useRef(false)
  const prevLostModalOpen = useRef(false)
  
  useEffect(() => {
    // Check if a modal was just closed
    if (prevFoundModalOpen.current && !reportFoundModalOpen) {
      setTimeout(() => fetchLatestDocuments(), 500)
    }
    if (prevLostModalOpen.current && !reportLostModalOpen) {
      setTimeout(() => fetchLatestDocuments(), 500)
    }
    prevFoundModalOpen.current = reportFoundModalOpen
    prevLostModalOpen.current = reportLostModalOpen
  }, [reportFoundModalOpen, reportLostModalOpen])

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
        // Combine lost and found results
        const allResults = [
          ...(data.results?.lostReports || []).map((r: any) => ({ ...r, type: 'lost', reportDate: r.lostDate || r.createdAt })),
          ...(data.results?.foundReports || []).map((r: any) => ({ ...r, type: 'found', reportDate: r.foundDate || r.createdAt })),
        ]
        setSearchResults(allResults)
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
      router.push('/dashboard')
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
        const response = await fetch('/api/documents/latest?limit=1000')
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

  // Calculate counts for status filters
  const lostCount = allDocumentsForCounts.filter(doc => doc.type === 'lost').length
  const foundCount = allDocumentsForCounts.filter(doc => doc.type === 'found').length
  const urgentCount = allDocumentsForCounts.filter(doc => doc.isUrgent === true).length
  const reunitedCount = allDocumentsForCounts.filter(doc => 
    doc.status === 'MATCHED' || 
    doc.status === 'VERIFIED' || 
    doc.status === 'HANDED_OVER'
  ).length
  const nearbyCount = allDocumentsForCounts.filter(doc => 
    (doc.lostLocation && doc.lostLocation.trim() !== '') || 
    (doc.foundLocation && doc.foundLocation.trim() !== '')
  ).length

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
                        🚨 URGENT: {doc.type === 'lost' ? 'Lost' : 'Found'} {doc.documentNumber 
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

      {/* Navbar */}
      <nav className="fixed left-0 right-0 z-50 bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
          <div className="flex items-center justify-between h-12 sm:h-20 gap-3">
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl group-hover:scale-105 transition-transform">
                  <FileCheck className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-3xl font-bold text-gray-900 tracking-tight">UNLF</span>
                <span className="text-xs text-gray-600 font-medium hidden sm:block">United Lost & Found</span>
              </div>
            </Link>
            
            {/* Desktop Searchbar */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-4 relative" ref={searchContainerRef}>
              <div className="w-full bg-white border border-gray-300 rounded-[1.5rem] transition-all duration-200">
                <div className="flex items-center gap-0 p-1.5">
                  {/* Search Input */}
                  <div className="relative flex-1 flex items-center min-w-0">
                    <Search className="absolute left-3 h-4 w-4 text-gray-400 z-10" />
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
                      className="flex-1 h-10 pl-10 pr-3 text-sm border-0 focus-visible:ring-0 focus-visible:outline-none bg-transparent"
                    />
                  </div>

                  {/* Divider */}
                  <div className="h-6 w-px bg-gray-200 mx-1"></div>

                  {/* Location Filter */}
                  <div className="flex items-center">
                    <Select>
                      <SelectTrigger className="w-[140px] h-8 border-0 focus:ring-0 text-xs bg-transparent hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
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
                  <div className="h-6 w-px bg-gray-200 mx-1"></div>

                  {/* Category Filter */}
                  <div className="flex items-center">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[160px] h-8 border-0 focus:ring-0 text-xs bg-transparent hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-1.5">
                          <Filter className="h-3.5 w-3.5 text-blue-600" />
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
                  <div className="h-6 w-px bg-gray-200 mx-1"></div>

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
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] z-50 max-h-96 overflow-y-auto border border-gray-100">
                  {suggestionsLoading ? (
                    <div className="p-4 text-center">
                      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Searching...</p>
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
                                  {suggestion.type === 'lost' ? 'Missing' : 'Recovered'}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {suggestion.documentType?.replace(/_/g, ' ') || 'Document'}
                                </span>
                              </div>
                              {suggestion.description && (
                                <p className="text-sm text-gray-600 line-clamp-1">
                                  {suggestion.description}
                                </p>
                              )}
                              {(suggestion.lostLocation || suggestion.foundLocation) && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
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
                    <div className="p-4 text-center text-sm text-gray-500">
                      No suggestions found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-shrink-0">
              {/* Mobile Actions */}
              <div className="flex items-center gap-2 sm:hidden">
                <Button
                  className="h-9 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full text-xs font-medium flex items-center gap-1"
                  type="button"
                  onClick={() => {
                    setReportLostModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <Plus className="h-3 w-3" />
                  <span>Report</span>
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
                {/* Desktop Primary CTA */}
                <Button 
                  className="hidden lg:flex h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-medium transition-all duration-200 flex items-center gap-2 border border-blue-500/50"
                  type="button"
                  onClick={() => {
                    setReportLostModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Report Item
                </Button>
                
                {/* Found Item Button */}
                <Button 
                  className="h-9 sm:h-11 sm:w-auto sm:px-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full text-xs sm:text-base font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 border border-green-500/50"
                  type="button"
                  onClick={() => {
                    setReportFoundModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Report Found</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-blue-700/50 py-4 animate-in slide-in-from-top duration-200">
              <div className="flex flex-col gap-2">
                <Button 
                  className="mt-2 mx-4 h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  onClick={() => {
                    setReportLostModalOpen(true)
                    setMobileMenuOpen(false)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Report Item
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Header with Search Section */}
      <section className="bg-white container mx-auto px-2 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-6 sm:pb-8 overflow-x-hidden">

        {/* Search Section - Item-Focused */}
        <div className="space-y-4 overflow-x-hidden">
          {/* Main Search Bar with Integrated Filters */}
          <div className="flex justify-center">
            <div className="w-full max-w-6xl" ref={searchContainerRef}>
              {/* Mobile: All-in-one Searchbar */}
              <div className="md:hidden relative">
                <div className="bg-white border border-gray-300 rounded-[2rem] transition-all duration-200 p-1.5">
                  <div className="flex items-center gap-1">
                    {/* Search Input */}
                    <div className="relative flex-1 flex items-center min-w-0">
                      <Search className="absolute left-2 h-3.5 w-3.5 text-gray-400 z-10" />
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
                        className="flex-1 h-9 pl-8 pr-1.5 text-xs border-0 focus-visible:ring-0 focus-visible:outline-none bg-transparent"
                      />
                    </div>
                    
                    {/* Divider */}
                    <div className="h-5 w-px bg-gray-200 flex-shrink-0"></div>
                    
                    {/* Location Filter */}
                    <Select>
                      <SelectTrigger className="w-[70px] h-9 border-0 focus:ring-0 text-[10px] bg-transparent hover:bg-gray-50 rounded-lg transition-colors px-1 flex-shrink-0">
                        <div className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3 text-blue-600" />
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
                    <div className="h-5 w-px bg-gray-200 flex-shrink-0"></div>
                    
                    {/* Category Filter */}
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[75px] h-9 border-0 focus:ring-0 text-[10px] bg-transparent hover:bg-gray-50 rounded-lg transition-colors px-1 flex-shrink-0">
                        <div className="flex items-center gap-0.5">
                          <Filter className="h-3 w-3 text-blue-600" />
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
                    <div className="h-5 w-px bg-gray-200 flex-shrink-0"></div>

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
                <div className="md:hidden absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] z-50 max-h-96 overflow-y-auto border border-gray-100">
                    {suggestionsLoading ? (
                      <div className="p-4 text-center">
                        <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Searching...</p>
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
                                    {suggestion.type === 'lost' ? 'Missing' : 'Recovered'}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {suggestion.documentType?.replace(/_/g, ' ') || 'Document'}
                                  </span>
          </div>
                                {suggestion.description && (
                                  <p className="text-sm text-gray-600 line-clamp-1">
                                    {suggestion.description}
                                  </p>
                                )}
                                {(suggestion.lostLocation || suggestion.foundLocation) && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
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
                      <div className="p-4 text-center text-sm text-gray-500">
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
          {/* Latest Documents - Left Side (2/3 width) */}
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
                    const order: Array<'all' | 'lost' | 'found' | 'reunited' | 'urgent' | 'nearby'> = [
                      'all',
                      'lost',
                      'found',
                      'reunited',
                      'urgent',
                      'nearby',
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
                <Button
                  variant="ghost"
                  className={`h-10 sm:h-12 px-4 sm:px-6 rounded-full flex-shrink-0 text-xs sm:text-sm transition-all duration-200 ${
                    documentViewType === 'all'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-700 font-medium'
                  }`}
                  onClick={() => setDocumentViewType('all')}
                >
                  All Items
                </Button>
                <Button
                  variant="ghost"
                  className={`h-10 sm:h-12 px-4 sm:px-6 rounded-full flex items-center gap-1 sm:gap-2 flex-shrink-0 text-xs sm:text-sm transition-all duration-200 ${
                    documentViewType === 'lost'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-700 font-medium'
                  }`}
                  onClick={() => setDocumentViewType('lost')}
                >
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Lost</span>
                  <span className="sm:hidden">Lost</span>
                  <span className="ml-1 font-normal">({lostCount})</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`h-10 sm:h-12 px-4 sm:px-6 rounded-full flex items-center gap-1 sm:gap-2 flex-shrink-0 text-xs sm:text-sm transition-all duration-200 ${
                    documentViewType === 'found'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-700 font-medium'
                  }`}
                  onClick={() => setDocumentViewType('found')}
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Found</span>
                  <span className="sm:hidden">Found</span>
                  <span className="ml-1 font-normal">({foundCount})</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`h-10 sm:h-12 px-4 sm:px-6 rounded-full flex items-center gap-1 sm:gap-2 flex-shrink-0 text-xs sm:text-sm transition-all duration-200 ${
                    documentViewType === 'reunited'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-700 font-medium'
                  }`}
                  onClick={() => setDocumentViewType('reunited')}
                >
                  <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Reunited</span>
                  <span className="sm:hidden">Reunited</span>
                  <span className="ml-1 font-normal">({reunitedCount})</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`h-10 sm:h-12 px-4 sm:px-6 rounded-full flex items-center gap-1 sm:gap-2 flex-shrink-0 text-xs sm:text-sm transition-all duration-200 ${
                    documentViewType === 'urgent'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-700 font-medium'
                  }`}
                  onClick={() => setDocumentViewType('urgent')}
                >
                  <AlertTriangle className={`h-3 w-3 sm:h-4 sm:w-4 ${documentViewType === 'urgent' ? 'text-white' : 'text-orange-500'}`} />
                  <span className="hidden sm:inline">Urgent</span>
                  <span className="sm:hidden">Urgent</span>
                  <span className="ml-1 font-normal">({urgentCount})</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`h-10 sm:h-12 px-4 sm:px-6 rounded-full flex items-center gap-1 sm:gap-2 flex-shrink-0 text-xs sm:text-sm transition-all duration-200 ${
                    documentViewType === 'nearby'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:text-white font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-700 font-medium'
                  }`}
                  onClick={() => setDocumentViewType('nearby')}
                >
                  <Navigation className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Nearby</span>
                  <span className="sm:hidden">Nearby</span>
                  <span className="ml-1 font-normal">({nearbyCount})</span>
                </Button>
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
                    // Apply category filter to search results
                    let filteredSearchResults = searchResults
                    if (selectedCategory !== 'all') {
                      filteredSearchResults = searchResults.filter(doc => doc.documentType === selectedCategory)
                    }
                    
                    if (filteredSearchResults.length === 0) {
                      return (
                    <div className="text-center py-12">
                      <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No documents found</p>
                          <p className="text-sm text-gray-400 mt-2">Try a different search query or category</p>
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
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      doc.type === 'lost' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {doc.type === 'lost' ? 'LOST' : 'FOUND'}
                                    </span>
                                    {doc.type === 'lost' && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-0.5">
                                        <Award className="h-2.5 w-2.5" />
                                        Reward
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
                                      {doc.type === 'lost' ? 'Lost' : 'Found'} on {new Date(doc.reportDate || doc.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                    <Button 
                                    variant={doc.type === 'lost' ? 'default' : 'default'}
                      size="sm" 
                                    className={`h-7 text-xs font-medium rounded-full whitespace-nowrap ${
                                      doc.type === 'lost'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                    onClick={(e) => toggleDocumentDropdown(doc, e)}
                                  >
                                  {doc.type === 'lost' ? (
                                      <>
                                        <Eye className="h-3 w-3 sm:mr-1" />
                                        <span className="hidden sm:inline">View</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-3 w-3 sm:mr-1" />
                                        <span className="hidden sm:inline">Claim</span>
                                      </>
                                    )}
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
                                    variant={doc.type === 'lost' ? 'default' : 'default'}
                      size="sm" 
                                    className={`flex-1 h-8 text-xs font-medium rounded-full ${
                                    doc.type === 'lost' 
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                    onClick={(e) => toggleDocumentDropdown(doc, e)}
                                  >
                                  {doc.type === 'lost' ? (
                                      <>
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Claim
                                      </>
                                    )}
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
                  // Filter documents based on view type and category
                  let filteredDocuments = documentViewType === 'all' 
                    ? latestDocuments 
                    : latestDocuments.filter(doc => doc.type === documentViewType)
                  
                  // Apply category filter
                  if (selectedCategory !== 'all') {
                    filteredDocuments = filteredDocuments.filter(doc => doc.documentType === selectedCategory)
                  }
                  
                  if (filteredDocuments.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {documentViewType === 'all' 
                            ? 'No documents found yet' 
                            : `No ${documentViewType === 'lost' ? 'missing' : 'recovered'} documents found`}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          {documentViewType === 'all' 
                            ? 'Be the first to report a missing or recovered document'
                            : `Be the first to report a ${documentViewType === 'lost' ? 'missing' : 'recovered'} document`}
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
                                    variant={doc.type === 'lost' ? 'default' : 'default'}
                                    size="sm"
                                    className={`h-6 text-[10px] font-medium rounded-full whitespace-nowrap ${
                                      doc.type === 'lost'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                    onClick={(e) => toggleDocumentDropdown(doc, e)}
                                  >
                                {doc.type === 'lost' ? (
                                      <Eye className="h-3 w-3" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
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
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  doc.type === 'lost' 
                                      ? 'bg-red-100 text-red-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                    {doc.type === 'lost' ? 'LOST' : 'FOUND'}
                                </span>
                                  {doc.type === 'lost' && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-0.5">
                                      <Award className="h-2.5 w-2.5" />
                                      Reward
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
                                  variant={doc.type === 'lost' ? 'default' : 'default'}
                                  size="sm"
                                  className={`h-8 text-xs font-medium rounded-full whitespace-nowrap ${
                                    doc.type === 'lost'
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                  onClick={(e) => toggleDocumentDropdown(doc, e)}
                                >
                                  {doc.type === 'lost' ? (
                                    <>
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Claim
                                    </>
                                  )}
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
            <div className="lg:sticky lg:top-24 space-y-4">
              {adsLoading ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                  <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : ads.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                  <p className="text-sm text-gray-500">Ad Space</p>
                </div>
              ) : (
                ads.map((ad) => (
                  <a
                    key={ad.id}
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <div className="bg-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                      <img
                        src={ad.image}
                        alt={ad.title || "Advertisement"}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Ads Section - Below Documents (Mobile Only) */}
        <div className="lg:hidden mt-8">
          {adsLoading ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
              <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : ads.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ads.map((ad) => (
                <a
                  key={ad.id}
                  href={ad.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <div className="bg-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src={ad.image}
                      alt={ad.title || "Advertisement"}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upload Recovered Modal */}
      <ReportFoundModal 
        open={reportFoundModalOpen} 
        onOpenChange={setReportFoundModalOpen} 
      />

      {/* Report Missing Modal */}
      <ReportLostModal 
        open={reportLostModalOpen} 
        onOpenChange={setReportLostModalOpen} 
      />

      {/* Document Details Modal */}
      <DocumentDetailsModal 
        open={documentDetailsModalOpen} 
        onOpenChange={setDocumentDetailsModalOpen}
        document={selectedDocument}
      />

      {/* Login Modal */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <DialogTitle className="text-2xl text-center">Welcome Back</DialogTitle>
            <DialogDescription className="text-center">
              Login to your Iyawe account
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={loginFormData.email}
                onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginFormData.password}
                onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link href="/register" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="sm:max-w-4xl p-0 bg-black/95">
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

      {/* Mobile Floating Button - Report Item */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
          onClick={() => setReportLostModalOpen(true)}
          size="lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-lg">
                  <FileCheck className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">UNLF</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                United Lost & Found - Connecting lost items with their owners across Rwanda.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/matches" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    Matches
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setReportLostModalOpen(true)}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    Report Lost Item
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setReportFoundModalOpen(true)}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    Report Found Item
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Us</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href="mailto:contact@unlf.rw" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    contact@unlf.rw
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href="tel:+250788123456" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    +250 788 123 456
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Kigali, Rwanda</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                © {new Date().getFullYear()} United Lost & Found (UNLF). All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

