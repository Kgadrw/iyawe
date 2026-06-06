/** @type {import('next').NextConfig} */
function getBackendApiBase() {
  // Vercel Services injects NEXT_PUBLIC_BACKEND_URL (e.g. /_/backend)
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '')}/api`
  }
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
        source: '/api/:path*',
        destination: `${apiBase}/:path*`,
      },
    ]
  },
  allowedDevOrigins: ['192.168.56.1', 'localhost', '127.0.0.1'],
}

module.exports = nextConfig
