import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/backend-fetch'

export async function proxyBackendRequest(req: NextRequest, backendPath: string) {
  const url = new URL(req.url)
  const targetPath = `${backendPath}${url.search}`

  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = hasBody ? await req.arrayBuffer() : undefined

  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  let backendRes: Response
  try {
    backendRes = await fetchBackend(targetPath, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
    })
  } catch (error) {
    console.error(`Backend proxy error ${targetPath}:`, error)
    return NextResponse.json({ error: 'Failed to reach API server' }, { status: 502 })
  }

  const resHeaders = new Headers()
  const backendContentType = backendRes.headers.get('content-type')
  if (backendContentType) resHeaders.set('content-type', backendContentType)

  return new NextResponse(await backendRes.arrayBuffer(), {
    status: backendRes.status,
    headers: resHeaders,
  })
}

export function createBackendRouteHandlers(apiBase: string) {
  async function handler(
    req: NextRequest,
    context: { params: { path?: string[] } }
  ) {
    const suffix = context.params.path?.length ? `/${context.params.path.join('/')}` : ''
    return proxyBackendRequest(req, `${apiBase}${suffix}`)
  }

  return {
    GET: handler,
    POST: handler,
    PATCH: handler,
    PUT: handler,
    DELETE: handler,
  }
}
