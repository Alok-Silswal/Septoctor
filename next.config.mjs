/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Suppress Node.js warnings during build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), { 'node:diagnostics_channel': 'commonjs node:diagnostics_channel' }];
    }
    return config;
  },
}

export default nextConfig
