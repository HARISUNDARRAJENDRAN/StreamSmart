import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable static error pages to avoid Html import issues
  experimental: {
    optimizeServerReact: false,
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'framer-motion', '@aws-sdk/client-dynamodb'],
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            ui: {
              name: 'ui',
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    return config;
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add rewrites for API routes in production
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Environment variable validation
  // For Amplify SSR: embed credentials at build time since Lambda@Edge doesn't support runtime env vars
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    STREAMSMART_AWS_ACCESS_KEY_ID: process.env.STREAMSMART_AWS_ACCESS_KEY_ID,
    STREAMSMART_AWS_SECRET_ACCESS_KEY: process.env.STREAMSMART_AWS_SECRET_ACCESS_KEY,
    STREAMSMART_AWS_REGION: process.env.STREAMSMART_AWS_REGION,
    // ElastiCache configuration for Redis caching
    AWS_ELASTICACHE_HOST: process.env.AWS_ELASTICACHE_HOST || 'master.streamsmart-cache-redis.ofismd.aps1.cache.amazonaws.com',
    AWS_ELASTICACHE_PORT: process.env.AWS_ELASTICACHE_PORT || '6379',
    AWS_ELASTICACHE_TLS: process.env.AWS_ELASTICACHE_TLS || 'true',
  },
};

export default nextConfig;
