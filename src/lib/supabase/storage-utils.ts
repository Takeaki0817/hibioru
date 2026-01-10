/**
 * Supabase Storage ユーティリティ
 * 署名付きURL生成に使用するヘルパー関数
 */

/**
 * 署名付きURL設定
 */
export const SIGNED_URL_CONFIG = {
  // 署名付きURLの有効期限（秒）
  // 1時間 = 3600秒
  EXPIRY_SECONDS: 3600,
  // Supabase Storageのパスパターン
  STORAGE_URL_PATTERN: /\/storage\/v1\/object\/public\/entry-images\/(.+)/,
} as const

/**
 * 公開URLからファイルパスを抽出
 * @example
 * "https://xxx.supabase.co/storage/v1/object/public/entry-images/user-id/file.webp"
 * -> "user-id/file.webp"
 */
export function extractPathFromUrl(url: string): string | null {
  const match = url.match(SIGNED_URL_CONFIG.STORAGE_URL_PATTERN)
  return match ? match[1] : null
}
