/**
 * VAPID鍵設定モジュール
 *
 * Web Push通知に必要なVAPID鍵の読み込みとバリデーションを行います。
 *
 * 環境変数:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY: クライアントサイドで使用する公開鍵
 *   - VAPID_PRIVATE_KEY: サーバーサイドで使用する秘密鍵
 *
 * 鍵の生成:
 *   pnpm vapid:generate
 */

/**
 * VAPID設定
 */
export interface VapidConfig {
  /** VAPID公開鍵（Base64 URL-safe形式） */
  publicKey: string | undefined;
  /** VAPID秘密鍵（Base64 URL-safe形式） */
  privateKey: string | undefined;
}

/**
 * VAPID設定のバリデーション結果
 */
export interface VapidValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージの配列 */
  errors: string[];
}

/**
 * 環境変数からVAPID設定を取得する
 *
 * @returns VAPID設定オブジェクト（鍵が未設定の場合はundefined）
 */
export function getVapidConfig(): VapidConfig {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
}

/**
 * VAPID設定をバリデーションする
 *
 * @param config - バリデーション対象のVAPID設定
 * @returns バリデーション結果
 */
export function validateVapidConfig(config: VapidConfig): VapidValidationResult {
  const errors: string[] = [];

  // 公開鍵のチェック
  if (!config.publicKey || config.publicKey.trim() === '') {
    errors.push('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
  }

  // 秘密鍵のチェック
  if (!config.privateKey || config.privateKey.trim() === '') {
    errors.push('VAPID_PRIVATE_KEY is not set');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 通知機能が利用可能かどうかを判定する
 *
 * VAPID鍵が正しく設定されている場合にtrueを返します。
 *
 * @returns 通知機能が利用可能な場合true
 */
export function isNotificationEnabled(): boolean {
  const config = getVapidConfig();
  const validation = validateVapidConfig(config);
  return validation.isValid;
}

/**
 * クライアントサイドで使用するVAPID公開鍵を取得する
 *
 * @returns VAPID公開鍵（未設定の場合はundefined）
 */
export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}
