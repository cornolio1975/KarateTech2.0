import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';
// Default to root deployment so Hostinger works without a special fallback.
// Explicit builds can still set NEXT_PUBLIC_BASE_PATH (for example, GitHub Pages).
const basePath = isDev ? '' : (process.env.NEXT_PUBLIC_BASE_PATH ?? '');
const rawAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX?.trim();
const assetPrefixOverride = rawAssetPrefix
  ? `/${rawAssetPrefix.replace(/^\/+|\/+$/g, '')}`
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.56.1'],
  output: (process.env.BUILD_TARGET === 'electron' || process.env.BUILD_TARGET === 'standalone' || process.env.BUILD_TARGET === 'server') ? 'standalone' : 'export',
  trailingSlash: true,
  basePath: basePath,
  assetPrefix: assetPrefixOverride ?? (basePath ? `${basePath}/` : undefined),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
