/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Replit
  output: 'standalone',
  // Use server components
  reactStrictMode: true,
  // Allow all origins in development for the Replit environment
  experimental: {
    allowedDevOrigins: ['*'], // Allow all origins for development
    ppr: false,
  },
  // Security policy settings
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  // Disable image optimization for Replit environment
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;