import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxied API routes are rewritten to Render. The browser `token` cookie is signed
 * for the Next.js app; the backend expects its own JWT in `backend_token`.
 * Replace the forwarded session cookie before the rewrite runs.
 */
export function middleware(request: NextRequest) {
  const backendToken = request.cookies.get('backend_token')?.value
  if (!backendToken) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  const cookieParts =
    request.headers
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith('token=')) ?? []

  cookieParts.push(`token=${backendToken}`)
  requestHeaders.set('cookie', cookieParts.join('; '))
  requestHeaders.set('authorization', `Bearer ${backendToken}`)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/api/reports/:path*',
    '/api/matches/:path*',
    '/api/verify/:path*',
    '/api/search/:path*',
    '/api/documents/:path*',
    '/api/admin/:path*',
    '/api/institutions/:path*',
    '/api/claims/:path*',
    '/api/document-watch/:path*',
  ],
}
