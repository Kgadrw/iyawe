/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    // Enable SWC for better JSX parsing
  },
}

module.exports = nextConfig

