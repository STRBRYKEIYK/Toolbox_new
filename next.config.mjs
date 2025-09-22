/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // For Electron support
  output: 'export',
  distDir: 'out',
  // Adjust for static export
  trailingSlash: true,
}

export default nextConfig
