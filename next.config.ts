import createMDX from '@next/mdx'
import type { NextConfig } from "next";

// セキュリティヘッダー定義
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.jsのインラインスクリプト・スタイルに必要
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // 画像ソース
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://ywfotxkfnsqzybndymsw.supabase.co",
      // フォント
      "font-src 'self' https://fonts.gstatic.com",
      // API接続（Supabase）
      "connect-src 'self' https://ywfotxkfnsqzybndymsw.supabase.co wss://ywfotxkfnsqzybndymsw.supabase.co",
      // iframeの埋め込み禁止
      "frame-ancestors 'none'",
      // フォーム送信先
      "form-action 'self'",
      // ベースURI
      "base-uri 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // MDXファイルをページとして認識
  pageExtensions: ['ts', 'tsx', 'mdx'],

  // React Compiler（自動メモ化によるパフォーマンス向上）
  reactCompiler: true,

  // Cache Components（'use cache'ディレクティブを有効化）
  // 有効化には<Suspense>でのラッピングが必要なため、将来のリファクタリングで導入予定
  // cacheComponents: true,

  // セキュリティヘッダー
  async headers() {
    return [
      {
        // 全ルートに適用
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

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
};

// MDXの設定
// Note: Turbopackではremarkプラグイン（関数）をシリアライズできないため、
// remark-gfmは使用しない。GFM機能（テーブル等）はMDXファイル内でHTMLを直接記述する。
const withMDX = createMDX()

export default withMDX(nextConfig);
