/**
 * API Configuration
 * Auth and authenticated routes stay same-origin (cookies + Next.js proxies).
 * Only large public payloads (ads) may call the backend directly.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

/** Public endpoints that may call the backend directly (large responses). */
const PUBLIC_DIRECT_PREFIXES = ['/api/ads']

export function publicApiUrl(endpoint: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''
  return base ? `${base}${endpoint}` : endpoint
}

export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith('/api/auth/')) {
    return endpoint
  }
  if (PUBLIC_DIRECT_PREFIXES.some((p) => endpoint === p || endpoint.startsWith(`${p}?`))) {
    return publicApiUrl(endpoint)
  }
  return endpoint
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = apiUrl(endpoint)
  const isFormData = options.body instanceof FormData

  const headers = new Headers(options.headers as HeadersInit | undefined)
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  })
}

export const API_ENDPOINTS = {
  register: '/api/auth/register',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  foundReports: '/api/reports/found',
  lostReports: '/api/reports/lost',
  claims: '/api/claims',
  documentWatch: '/api/document-watch',
  matchVerify: (matchId: string) => `/api/matches/${matchId}/verify`,
  verify: '/api/verify',
  search: (query: string) => `/api/search?q=${encodeURIComponent(query)}`,
  searchImage: '/api/search/image',
  latestDocuments: (limit?: number) => `/api/documents/latest${limit ? `?limit=${limit}` : ''}`,
  document: (id: string, type: string) =>
    `/api/documents/${id}?type=${encodeURIComponent(type)}`,
  ads: '/api/ads',
  foundReportStatus: (id: string) => `/api/reports/found/${id}/status`,
  institutions: '/api/institutions',
  adminUsers: '/api/admin/users',
  adminUser: (id: string) => `/api/admin/users/${id}`,
}
