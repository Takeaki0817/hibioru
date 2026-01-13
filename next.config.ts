import createMDX from '@next/mdx'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MDXファイルをページとして認識
  pageExtensions: ['ts', 'tsx', 'mdx'],

  // React Compiler（自動メモ化によるパフォーマンス向上）
  reactCompiler: true,

  // Cache Components（'use cache'ディレクティブを有効化）
  // 有効化には<Suspense>でのラッピングが必要なため、将来のリファクタリングで導入予定
  // cacheComponents: true,

  // リモート画像の許可設定
  images: {
    // ローカル開発時は画像最適化を無効化（プライベートIPへのアクセス制限を回避）
    unoptimized: process.env.NODE_ENV === 'development',
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

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // XSS攻撃対策
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // クリックジャッキング対策
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // リファラー情報の制御
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // ブラウザ機能の制限
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS（HTTPS強制）
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy
          // 注意: Google OAuth、Supabase、Stripe等の外部サービスを許可
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

// MDXの設定
// Note: Turbopackではremarkプラグイン（関数）をシリアライズできないため、
// remark-gfmは使用しない。GFM機能（テーブル等）はMDXファイル内でHTMLを直接記述する。
const withMDX = createMDX()

export default withMDX(nextConfig);
