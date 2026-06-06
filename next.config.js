/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'https://iyawe-backend.onrender.com'

const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // Enable SWC for better JSX parsing
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  allowedDevOrigins: ['192.168.56.1', 'localhost', '127.0.0.1'],
}

module.exports = nextConfig
