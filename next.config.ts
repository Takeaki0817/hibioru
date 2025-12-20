import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Google OAuth アバター画像を許可
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // パフォーマンス最適化
  experimental: {
    // 最適化されたパッケージインポート（バンドルサイズ削減）
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-dropdown-menu',
    ],
  },

  // 本番環境でのソースマップを無効化（バンドルサイズ削減）
  productionBrowserSourceMaps: false,
};

export default nextConfig;
