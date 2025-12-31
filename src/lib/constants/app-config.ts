/**
 * アプリケーション設定定数
 *
 * メタ情報を一元管理するための定数ファイルです。
 * 変更時は public/sw.js も手動で同期してください。
 *
 * @see public/sw.js - Service Workerは静的ファイルのため手動同期が必要
 */

/**
 * アプリケーション基本情報
 */
export const APP_CONFIG = {
  /** アプリ名（正式名称） */
  name: 'ヒビオル - 日々を織る',
  /** アプリ名（短縮形） */
  shortName: 'ヒビオル',
  /** アプリの説明（短い） */
  description: 'ADHD当事者のための瞬間記録アプリ',
  /** アプリの説明（詳細） */
  descriptionLong: 'ADHD当事者のための瞬間記録アプリ。継続することが最大の目的。',
  /** コンセプト */
  concept: '日々を織る',
} as const

/**
 * テーマカラー設定
 * Sage Green を基調としたカラーパレット
 */
export const THEME_CONFIG = {
  /** プライマリカラー（Sage Green） */
  primaryColor: '#5B8A5F',
  /** 背景色（ライト） */
  backgroundColor: '#F8FAF8',
} as const

/**
 * PWA設定
 */
export const PWA_CONFIG = {
  /** マニフェストID */
  id: '/',
  /** スコープ */
  scope: '/',
  /** 開始URL */
  startUrl: '/',
  /** 表示モード */
  display: 'standalone' as const,
  /** 画面の向き */
  orientation: 'portrait' as const,
  /** カテゴリ */
  categories: ['lifestyle', 'productivity', 'health'],
} as const

/**
 * アイコン設定
 */
export const ICON_CONFIG = {
  /** 192x192 アイコン */
  icon192: '/icon-192x192.png',
  /** 512x512 アイコン */
  icon512: '/icon-512x512.png',
  /** Apple Touch アイコン */
  appleTouchIcon: '/apple-touch-icon.png',
  /** Favicon 32x32 */
  favicon32: '/favicon-32x32.png',
  /** Favicon 16x16 */
  favicon16: '/favicon-16x16.png',
} as const

/**
 * 通知設定
 *
 * @note public/sw.js の DEFAULT_NOTIFICATION_OPTIONS と同期が必要
 */
export const NOTIFICATION_CONFIG = {
  /** デフォルトタイトル */
  defaultTitle: 'ヒビオル',
  /** デフォルト本文 */
  defaultBody: '今考えてること、記録しよう！',
  /** デフォルトアイコン */
  defaultIcon: '/icon-192x192.png',
  /** デフォルトバッジ */
  defaultBadge: '/badge-72.png',
  /** デフォルトURL */
  defaultUrl: '/',
  /** 通知タグ */
  tag: 'hibioru-notification',
} as const

/**
 * Service Worker設定
 *
 * @note public/sw.js の設定と同期が必要
 */
export const SW_CONFIG = {
  /** キャッシュバージョン */
  cacheVersion: 'v1',
  /** キャッシュ名プレフィックス */
  cacheName: 'hibioru',
} as const
