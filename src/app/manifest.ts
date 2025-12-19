import type { MetadataRoute } from 'next'

/**
 * PWA Web App Manifest
 * @see https://developer.mozilla.org/ja/docs/Web/Manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ヒビオル - 日々を織る',
    short_name: 'ヒビオル',
    description: 'ADHD当事者のための瞬間記録アプリ。継続することが最大の目的。',
    start_url: '/',
    display: 'standalone',
    // Sage Green テーマカラー
    background_color: '#F8FAF8',
    theme_color: '#5B8A5F',
    orientation: 'portrait',
    // PWAカテゴリ
    categories: ['lifestyle', 'productivity', 'health'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
