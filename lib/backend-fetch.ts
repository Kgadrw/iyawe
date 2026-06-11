import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'https://iyawe-backend.onrender.com'

/** Server-side fetch to the Render API using the backend session cookie. */
export async function fetchBackend(path: string, init: RequestInit = {}): Promise<Response> {
  const jar = await cookies()
  const token = jar.get('backend_token')?.value ?? jar.get('token')?.value
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Cookie', `token=${token}`)
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(`${BACKEND_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
}
