/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // Enable SWC for better JSX parsing
  },
  allowedDevOrigins: ['192.168.56.1', 'localhost', '127.0.0.1'],
}

module.exports = nextConfig

