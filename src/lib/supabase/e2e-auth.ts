import 'server-only'

import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

/**
 * E2Eテスト環境用の認証ヘルパー
 * テスト環境でのみ有効なモックユーザーを返す
 *
 * ## セキュリティ境界
 *
 * 1. E2E_TEST_MODE=true が明示的に設定された場合のみ有効
 *    - playwright.config.ts の webServer.env でのみ設定される
 *    - 本番環境では絶対に設定しないこと
 *
 * 2. NODE_ENV=development は意図的に除外
 *    - 開発環境での意図しない認証バイパスを防止
 *
 * 3. 許可されたテストユーザーIDのみ受け入れ（ホワイトリスト検証）
 *    - ALLOWED_TEST_USER_IDS に含まれるUUIDのみ有効
 *    - 不正なUUIDはnullを返しログに記録
 *
 * 4. RLSポリシーによる二重防御
 *    - auth.uid() はJWTトークンから取得されるため、
 *      cookieの値だけではRLSをバイパスできない
 */

/**
 * E2Eテストで使用を許可されたユーザーID
 * test-helpers.ts の TEST_USERS と同期を保つこと
 */
export const ALLOWED_TEST_USER_IDS = [
  // 基本テストユーザー
  '00000000-0000-0000-0000-000000000001', // PRIMARY
  '00000000-0000-0000-0000-000000000002', // SECONDARY
  // Billingテストユーザー
  '00000000-0000-4000-8000-000000000001', // BILLING_FREE
  '00000000-0000-4000-8000-000000000002', // BILLING_PREMIUM
  '00000000-0000-4000-8000-000000000003', // BILLING_CANCELED
  // Hotsure自動化テストユーザー
  '00000000-0000-4000-8000-000000000010', // HOTSURE_TEST
  '00000000-0000-4000-8000-000000000011', // CONCURRENT_1
  '00000000-0000-4000-8000-000000000012', // CONCURRENT_2
] as const

interface MockUser {
  id: string
  aud: string
  role: string
  email: string
  email_confirmed_at: string
  app_metadata: {
    provider: string
  }
  user_metadata: {
    full_name: string
    avatar_url: string | null
  }
  created_at: string
}

/** 認証済みユーザーの型（MockUserまたはSupabase User） */
export type AuthenticatedUser = MockUser | User

/**
 * E2Eテストモードかどうかを判定
 * playwright.config.ts の webServer.env で E2E_TEST_MODE=true が設定される
 * @returns {boolean} E2Eテストモードの場合true
 */
export function isE2ETestMode(): boolean {
  // セキュリティ: 明示的な環境変数でのみ有効化
  // NODE_ENV === 'development' は含めない（開発環境での意図しない認証バイパスを防止）
  return process.env.E2E_TEST_MODE === 'true'
}

/**
 * E2EテストユーザーIDをCookieから取得
 * セキュリティ: ホワイトリストに含まれるIDのみ有効
 * @returns {Promise<string | undefined>} テストユーザーID（無効な場合はundefined）
 */
export async function getE2ETestUserId(): Promise<string | undefined> {
  if (!isE2ETestMode()) {
    return undefined
  }

  const cookieStore = await cookies()
  const testUserId = cookieStore.get('e2e-test-user-id')?.value

  if (!testUserId) {
    return undefined
  }

  // ホワイトリスト検証: 許可されたテストユーザーIDのみ受け入れ
  if (!ALLOWED_TEST_USER_IDS.includes(testUserId as typeof ALLOWED_TEST_USER_IDS[number])) {
    logger.warn('Invalid E2E test user ID attempted', { testUserId })
    return undefined
  }

  return testUserId
}

/**
 * E2Eテスト用のモックユーザーを生成
 * @param userId テストユーザーID
 * @returns モックユーザーオブジェクト
 */
export function createMockUser(userId: string): MockUser {
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'e2e-test@example.com',
    email_confirmed_at: new Date().toISOString(),
    app_metadata: {
      provider: 'google',
    },
    user_metadata: {
      full_name: 'E2Eテストユーザー',
      avatar_url: null,
    },
    created_at: new Date().toISOString(),
  }
}

/**
 * E2Eテストモードの場合はモックユーザーを返す
 * それ以外はnullを返す（呼び出し元で通常の認証を行う）
 */
export async function getE2EMockUser(): Promise<MockUser | null> {
  const testUserId = await getE2ETestUserId()
  if (testUserId) {
    return createMockUser(testUserId)
  }
  return null
}

/**
 * 認証済みユーザーを取得
 * E2Eテストモードの場合はモックユーザーを優先、それ以外はSupabase認証を使用
 * @param supabase Supabaseクライアント
 * @returns ユーザーオブジェクトまたはnull
 */
export async function getAuthenticatedUser(
  supabase: { auth: { getUser: () => Promise<{ data: { user: User | null } }> } }
): Promise<AuthenticatedUser | null> {
  // E2Eテストモードの場合はモックユーザーを優先
  const mockUser = await getE2EMockUser()
  if (mockUser) {
    return mockUser
  }

  // 通常のSupabase認証
  const { data } = await supabase.auth.getUser()
  return data.user
}
