'use server'

import 'server-only'

// 認証アクション（Server Actions）

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Result } from '@/lib/types/result'
import { ok, err } from '@/lib/types/result'

interface DeleteAccountError {
  code: 'UNAUTHORIZED' | 'STORAGE_ERROR' | 'DELETE_ERROR' | 'UNKNOWN'
  message: string
}

/**
 * ログアウト処理を実行
 * セッションを終了し、ログインページへリダイレクト
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
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

/**
 * アカウント削除処理
 * 1. 認証チェック
 * 2. Storage内のユーザー画像削除
 * 3. Supabase Authからユーザー削除（CASCADE で関連データも削除）
 */
export async function deleteAccount(): Promise<Result<void, DeleteAccountError>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return err({ code: 'UNAUTHORIZED', message: '認証が必要です' })
  }

  const adminClient = createAdminClient()

  try {
    // 1. Storage内のユーザー画像を削除
    const { data: files } = await adminClient.storage
      .from('entry-images')
      .list(user.id)

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${user.id}/${f.name}`)
      const { error: storageError } = await adminClient.storage
        .from('entry-images')
        .remove(filePaths)

      if (storageError) {
        // Storage削除失敗は警告のみ、処理は続行
        console.error('Storage deletion failed:', storageError)
      }
    }

    // 2. Supabase Authからユーザーを削除（CASCADEで関連データ自動削除）
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('User deletion failed:', deleteError)
      return err({ code: 'DELETE_ERROR', message: 'アカウント削除に失敗しました' })
    }

    // 3. セッションをサインアウト（Cookieクリア）
    // ユーザー削除後はセッションが無効なため、エラーは無視
    try {
      await supabase.auth.signOut()
    } catch {
      // 削除済みユーザーのセッションクリアはエラーになる場合があるが無視
    }

    return ok(undefined)
  } catch (error) {
    console.error('deleteAccount error:', error)
    return err({ code: 'UNKNOWN', message: '予期しないエラーが発生しました' })
  }
}
