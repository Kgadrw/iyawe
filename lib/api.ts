/**
 * API Configuration
 * All /api/* requests are proxied to the Express backend (see next.config.js rewrites).
 * Leave API_BASE_URL empty for same-origin proxying so auth cookies work correctly.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

/**
 * Make an API request with proper configuration
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Auth endpoints should always go through Next.js (same origin) to set cookies properly
  const isAuthEndpoint = endpoint.startsWith('/api/auth/')
  const url = isAuthEndpoint ? endpoint : `${API_BASE_URL}${endpoint}`
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = options.body instanceof FormData
  
  const defaultHeaders: Record<string, string> = isFormData
    ? { ...options.headers }
    : {
        'Content-Type': 'application/json',
        ...options.headers,
      }

  // Add Authorization header for backend requests (cross-domain)
  if (!isAuthEndpoint && typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies for authentication
    headers: defaultHeaders,
  }

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    })
    return response
  } catch (error: any) {
    console.error(`API request failed to ${url}:`, error)
    throw new Error(`Failed to connect to ${endpoint}. Please ensure the server is running.`)
  }
}

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  register: '/api/auth/register',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  
  // Reports & claims
  foundReports: '/api/reports/found',
  lostReports: '/api/reports/lost', // legacy / admin only
  claims: '/api/claims',
  documentWatch: '/api/document-watch',
  
  // Matches
  matchVerify: (matchId: string) => `/api/matches/${matchId}/verify`,
  
  // Verification
  verify: '/api/verify',
  
  // Search
  search: (query: string) => `/api/search?q=${encodeURIComponent(query)}`,
  searchImage: '/api/search/image', // Note: Image search endpoint not yet implemented in backend
  
  // Documents
  latestDocuments: (limit?: number) => `/api/documents/latest${limit ? `?limit=${limit}` : ''}`,
  document: (id: string, type: string) =>
    `/api/documents/${id}?type=${encodeURIComponent(type)}`,

  // Ads
  ads: '/api/ads',

  foundReportStatus: (id: string) => `/api/reports/found/${id}/status`,

  // Institutions
  institutions: '/api/institutions',

  // Admin
  adminUsers: '/api/admin/users',
  adminUser: (id: string) => `/api/admin/users/${id}`,
}
