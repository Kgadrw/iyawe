export function getJwtSecretKey(): Uint8Array {
  const value = process.env.JWT_SECRET?.trim()
  if (!value && process.env.NODE_ENV === 'production') {
    console.warn(
      'JWT_SECRET is not set on the frontend — set the same value as Render backend in Vercel env vars.'
    )
  }
  return new TextEncoder().encode(value || 'your-secret-key-change-in-production')
}
