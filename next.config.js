/** @type {import('next').NextConfig} */
function getBackendApiBase() {
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api`
  }
  return 'https://iyawe-backend.onrender.com/api'
}

const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // Enable SWC for better JSX parsing
  },
  async rewrites() {
    const apiBase = getBackendApiBase()
    return [
      {
        // Auth routes are handled by Next.js API routes (app/api/auth/*)
        // so we only rewrite non-auth API calls to the backend
        source: '/api/reports/:path*',
        destination: `${apiBase}/reports/:path*`,
      },
      {
        source: '/api/matches/:path*',
        destination: `${apiBase}/matches/:path*`,
      },
      {
        source: '/api/verify/:path*',
        destination: `${apiBase}/verify/:path*`,
      },
      {
        source: '/api/search/:path*',
        destination: `${apiBase}/search/:path*`,
      },
      {
        source: '/api/documents/:path*',
        destination: `${apiBase}/documents/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${apiBase}/admin/:path*`,
      },
      {
        source: '/api/institutions/:path*',
        destination: `${apiBase}/institutions/:path*`,
      },
      {
        source: '/api/ads/:path*',
        destination: `${apiBase}/ads/:path*`,
      },
      {
        source: '/api/ads',
        destination: `${apiBase}/ads`,
      },
      {
        source: '/api/claims/:path*',
        destination: `${apiBase}/claims/:path*`,
      },
      {
        source: '/api/document-watch/:path*',
        destination: `${apiBase}/document-watch/:path*`,
      },
    ]
  },
  allowedDevOrigins: ['192.168.56.1', 'localhost', '127.0.0.1'],
}

module.exports = nextConfig
