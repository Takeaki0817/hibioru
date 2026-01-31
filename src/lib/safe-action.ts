import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { isBusinessLogicError } from '@/lib/errors'
import { getAuthenticatedUser, isE2ETestMode, type AuthenticatedUser } from '@/lib/supabase/e2e-auth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.generated'

/**
 * 認証済みコンテキスト型
 */
export interface AuthContext {
  user: AuthenticatedUser
  supabase: SupabaseClient<Database>
}

/**
 * 基本クライアント（認証不要アクション用）
 * handleServerErrorでエラーログを出力し、ユーザーには汎用メッセージを返す
 */
export const actionClient = createSafeActionClient({
  handleServerError: (error) => {
    // ビジネスロジックエラー（ユーザー向け）はそのまま返す
    if (isBusinessLogicError(error)) {
      logger.warn('ビジネスロジックエラー', { message: error.message })
      return error.message
    }

    // 内部エラーは汎用化（詳細はログのみ）
    logger.error('Server Action エラー', error)
    return '処理中にエラーが発生しました'
  },
})

/**
 * 認証必須クライアント
 * ミドルウェアで認証チェックを行い、user と supabase をコンテキストに渡す
 * E2Eテストモードではモックユーザーとadminクライアント（RLSバイパス）を使用
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  // E2Eテストモードではadminクライアントを使用（RLSバイパス）
  // 通常モードでは通常のクライアントを使用
  const isE2E = isE2ETestMode()
  const supabase = isE2E ? createAdminClient() : await createClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    throw new Error('認証が必要です')
  }

  return next({ ctx: { user, supabase } })
})
