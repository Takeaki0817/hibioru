'use server'

// 認証アクション（Server Actions）

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * ログアウト処理を実行
 * セッションを終了し、ログインページへリダイレクト
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * 現在のユーザー情報を取得
 * @returns ユーザー情報（未認証の場合はnull）
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
