import 'server-only'

import { cookies } from 'next/headers'

/**
 * E2Eテスト環境用の認証ヘルパー
 * テスト環境でのみ有効なモックユーザーを返す
 */

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

/**
 * E2Eテストモードかどうかを判定
 * 開発環境でも有効にすることでE2Eテスト実行を容易にする
 * @returns {boolean} E2Eテストモードの場合true
 */
export function isE2ETestMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    process.env.E2E_TEST_MODE === 'true'
  )
}

/**
 * E2EテストユーザーIDをCookieから取得
 * @returns {Promise<string | undefined>} テストユーザーID
 */
export async function getE2ETestUserId(): Promise<string | undefined> {
  if (!isE2ETestMode()) {
    return undefined
  }

  const cookieStore = await cookies()
  return cookieStore.get('e2e-test-user-id')?.value
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
  supabase: { auth: { getUser: () => Promise<{ data: { user: unknown } }> } }
): Promise<MockUser | null> {
  // E2Eテストモードの場合はモックユーザーを優先
  const mockUser = await getE2EMockUser()
  if (mockUser) {
    return mockUser
  }

  // 通常のSupabase認証
  const { data } = await supabase.auth.getUser()
  return data.user as MockUser | null
}
