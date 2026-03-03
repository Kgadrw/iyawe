/**
 * API Configuration
 * Centralized configuration for backend API calls
 */

// Backend API base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

/**
 * Make an API request with proper configuration
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = options.body instanceof FormData
  
  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies for authentication
    headers: isFormData
      ? { ...options.headers }
      : {
          'Content-Type': 'application/json',
          ...options.headers,
        },
  }

  return fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  })
}

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  register: '/api/auth/register',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  
  // Reports
  lostReports: '/api/reports/lost',
  foundReports: '/api/reports/found',
  
  // Matches
  matchVerify: (matchId: string) => `/api/matches/${matchId}/verify`,
  
  // Verification
  verify: '/api/verify',
  
  // Search
  search: (query: string) => `/api/search?q=${encodeURIComponent(query)}`,
  searchImage: '/api/search/image', // Note: Image search endpoint not yet implemented in backend
  
  // Documents
  latestDocuments: (limit?: number) => `/api/documents/latest${limit ? `?limit=${limit}` : ''}`,
  
  // Institutions
  institutions: '/api/institutions',
}
