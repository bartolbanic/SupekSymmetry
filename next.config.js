/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Replit
  output: 'standalone',
  // Use server components
  reactStrictMode: true,
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
        ],
      },
    ];
  },
};

module.exports = nextConfig;