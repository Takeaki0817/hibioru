import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler（自動メモ化によるパフォーマンス向上）
  reactCompiler: true,

  // Cache Components（'use cache'ディレクティブを有効化）
  // 有効化には<Suspense>でのラッピングが必要なため、将来のリファクタリングで導入予定
  // cacheComponents: true,

  // リモート画像の許可設定
  images: {
    remotePatterns: [
      // Google OAuth アバター画像
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      // Supabase Storage（本番）
      {
        protocol: 'https',
        hostname: 'ywfotxkfnsqzybndymsw.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // Supabase Storage（ローカル開発）
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/**',
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
    // Turbopack ファイルシステムキャッシュ（開発時のコンパイル高速化）
    turbopackFileSystemCacheForDev: true,
  },

  // 本番環境でのソースマップを無効化（バンドルサイズ削減）
  productionBrowserSourceMaps: false,
};

export default nextConfig;
