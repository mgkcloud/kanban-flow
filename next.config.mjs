import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Only ignore during development
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  typescript: {
    // Only ignore during development
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  images: {
    unoptimized: true, // Required for Cloudflare Workers
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Ensure compatibility with Cloudflare Workers
  experimental: {
    serverActions: {
      // Restrict to specific origins for security
      allowedOrigins: [
        'tasks.feistyagency.com',
        process.env.NODE_ENV === 'development' ? 'localhost:3000' : null,
      ].filter(Boolean),
    },
  },
  // Moved from experimental to top-level
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Cloudflare cacheHandler should be configured in open-next.config.ts using @opennextjs/cloudflare and r2IncrementalCache
  
  // This is needed for OpenNext to properly handle static assets
  output: 'standalone',
  
  // Remove hardcoded environment variables in favor of environment-specific configuration
  // env: {
  //   NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eehnntuxrpwoyxfrbimo.supabase.co",
  //   NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlaG5udHV4cnB3b3l4ZnJiaW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMzczNTEsImV4cCI6MjA2MDcxMzM1MX0.EHLxEEQ0vx7_8Xn0j1k3u2j30dT1COjWFYaGAvfDLuk",
  // },
  
  // Optimize cache headers for better CDN performance
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
          },
          // Add security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Apply long cache for static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Apply cache for images
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
    ];
  },
  
  // Set powered by header to false for security
  poweredByHeader: false,
}

export default nextConfig
