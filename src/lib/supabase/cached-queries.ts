import 'server-only'

import { cache } from 'react'
import { createClient } from './server'

/**
 * React cache() によるSupabaseクエリのメモ化
 *
 * Supabaseクエリはfetch APIを使用しないため、Next.jsの自動メモ化が効かない。
 * 同一リクエスト内で複数回呼び出されるクエリをcache()でラップすることで、
 * リクエスト単位でメモ化し、不要な重複クエリを防ぐ。
 *
 * 使用例:
 * - Server Component内で複数コンポーネントが同じユーザー情報を必要とする場合
 * - レイアウトと子ページで同じデータを参照する場合
 */

/**
 * 認証済みユーザーを取得（リクエスト単位でメモ化）
 *
 * 複数のServer Componentで認証ユーザーを参照する際、
 * 実際のSupabase呼び出しは1回のみになる。
 */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error('ユーザー取得エラー:', error.message)
    return null
  }

  return data.user
})

/**
 * ユーザープロフィールを取得（リクエスト単位でメモ化）
 */
export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('プロフィール取得エラー:', error.message)
    return null
  }

  return data
})

/**
 * 通知設定を取得（リクエスト単位でメモ化）
 */
export const getNotificationSettingsCached = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116: 行が見つからない（新規ユーザー）
    console.error('通知設定取得エラー:', error.message)
    return null
  }

  return data
})
