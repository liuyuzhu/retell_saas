import type { NextConfig } from 'next';
import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle retell-client-js-sdk for browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
    }
    
    // Ensure livekit-client resolves to the correct version
    config.resolve.alias = {
      ...config.resolve.alias,
      'livekit-client': path.resolve(
        __dirname,
        'node_modules/.pnpm/retell-client-js-sdk@2.0.7/node_modules/livekit-client'
      ),
    };
    
    return config;
  },
  transpilePackages: ['retell-client-js-sdk'],
};

export default withNextIntl(nextConfig);
