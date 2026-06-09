/** @type {import('next').NextConfig} */
function getBackendApiBase() {
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api`
  }
  return 'https://iyawe-backend.onrender.com/api'
}

const nextConfig = {
  reactStrictMode: true,
  compiler: {},
  async rewrites() {
    const apiBase = getBackendApiBase()
    // Do not rewrite /api/auth/* — handled by app/api/auth routes (session cookies).
    const prefixes = [
      'reports',
      'matches',
      'verify',
      'search',
      'documents',
      'admin',
      'institutions',
      'claims',
      'document-watch',
    ]
    return prefixes.map((prefix) => ({
      source: `/api/${prefix}/:path*`,
      destination: `${apiBase}/${prefix}/:path*`,
    }))
  },
  allowedDevOrigins: ['192.168.56.1', 'localhost', '127.0.0.1'],
}

module.exports = nextConfig
