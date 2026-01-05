'use server'

import 'server-only'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { EntryInsert, EntryUpdate } from '@/lib/types/database'
import type { Entry, CreateEntryInput, UpdateEntryInput, EntryError, Result, CreateEntryResultWithAchievements, NewAchievementInfo } from '../types'
import { getAchievementLevel } from '@/features/social/utils/achievement-level'
import { isEditable } from '../utils'
import { handleEntryCreated } from '@/features/notification/api/entry-integration'
import { updateStreakOnEntry } from '@/features/streak/api/service'
import {
  checkAndCreateAchievements,
  deleteSharedEntryAchievement,
  touchSharedEntryAchievement,
} from '@/features/social/api/achievements'

/**
 * 新規エントリを作成
 *
 * エントリー作成成功時に以下の通知連携処理を実行します:
 * - 当日の通知ログのentry_recorded_atを更新（Requirement 6.1）
 * - 追いリマインドのキャンセル（Requirement 4.4）
 *
 * Requirements (achievement-celebration): 1.1, 1.2, 1.3, 1.4
 * - 新規達成したアチーブメント情報を戻り値に含める
 * - 新規達成がない場合は空配列を返却
 * - 達成情報の取得に失敗した場合はnullを返却（エントリ作成は成功）
 */
export async function createEntry(
  input: CreateEntryInput
): Promise<Result<CreateEntryResultWithAchievements, EntryError>> {
  try {
    const supabase = await createClient()

    // 空白のみのコンテンツをチェック
    if (input.content.trim().length === 0) {
      return {
        ok: false,
        error: { code: 'EMPTY_CONTENT', message: '内容を入力してください' }
      }
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' }
      }
    }

    const insertData: EntryInsert = {
      user_id: userData.user.id,
      content: input.content,
      image_urls: input.imageUrls ?? null,
      is_shared: input.isShared ?? false,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('entries')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    const entry = data as Entry

    // ストリーク更新、通知連携、達成チェックを並列実行（パフォーマンス最適化）
    // 達成チェックの結果は戻り値に含める
    const results = await Promise.allSettled([
      updateStreakOnEntry(userData.user.id),
      handleEntryCreated({
        userId: userData.user.id,
        entryId: entry.id,
        createdAt: new Date(entry.created_at),
      }),
      checkAndCreateAchievements(userData.user.id, entry.id, input.isShared ?? false),
    ])

    // エラーログ出力
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `並列処理[${index}]失敗:`,
          result.reason instanceof Error ? result.reason.message : result.reason
        )
      }
    })

    // 達成情報を抽出（Requirements 1.1, 1.2, 1.3, 1.4）
    let newAchievements: NewAchievementInfo[] | null = null
    const achievementResult = results[2] // checkAndCreateAchievements の結果

    if (achievementResult.status === 'fulfilled' && achievementResult.value.ok) {
      // 達成情報取得成功: レベルを付与して返却
      const achievements = achievementResult.value.value
      newAchievements = achievements.map((achievement) => ({
        type: achievement.type,
        threshold: achievement.threshold,
        level: getAchievementLevel(achievement.type, achievement.threshold),
      }))
    }
    // 達成チェック失敗時は newAchievements = null のまま（graceful degradation）

    // タイムラインとソーシャルページのSSRキャッシュを無効化
    revalidatePath('/timeline')
    revalidatePath('/social')

    return { ok: true, value: { entry, newAchievements } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
}

/**
 * エントリを更新
 */
export async function updateEntry(
  id: string,
  input: UpdateEntryInput
): Promise<Result<Entry, EntryError>> {
  try {
    const supabase = await createClient()

    // 既存エントリを取得して編集可能かチェック
    const getResult = await getEntry(id)
    if (!getResult.ok) {
      return getResult
    }

    if (!isEditable(getResult.value)) {
      return {
        ok: false,
        error: {
          code: 'EDIT_EXPIRED',
          message: '編集可能期間（24時間）を過ぎています'
        }
      }
    }

    const updateData: EntryUpdate = {
      content: input.content,
      image_urls: input.imageUrls ?? null,
      is_shared: input.isShared,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    const entry = data as Entry

    // 共有状態の変更を処理
    if (!getResult.value.is_shared && input.isShared) {
      // 非共有→共有: 達成レコードを作成
      await checkAndCreateAchievements(
        getResult.value.user_id,
        id,
        true
      ).catch((err) => {
        console.error('達成チェック失敗:', err instanceof Error ? err.message : err)
      })
    } else if (getResult.value.is_shared && !input.isShared) {
      // 共有→非共有: 達成レコードを削除
      await deleteSharedEntryAchievement(
        getResult.value.user_id,
        id
      ).catch((err) => {
        console.error('達成削除失敗:', err instanceof Error ? err.message : err)
      })
    } else if (getResult.value.is_shared && input.isShared) {
      // 共有状態を維持したまま内容を編集: achievements の updated_at を更新
      // これにより Realtime UPDATE イベントが発火し、フォロワーのフィードが更新される
      await touchSharedEntryAchievement(
        getResult.value.user_id,
        id
      ).catch((err) => {
        console.error('達成touch失敗:', err instanceof Error ? err.message : err)
      })
    }

    // タイムラインとソーシャルページのSSRキャッシュを無効化
    revalidatePath('/timeline')
    revalidatePath('/social')

    return { ok: true, value: entry }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
}

/**
 * エントリを論理削除
 */
export async function deleteEntry(id: string): Promise<Result<void, EntryError>> {
  try {
    const supabase = await createClient()

    // 削除前にエントリ情報を取得（共有状態確認のため）
    const getResult = await getEntry(id)
    if (!getResult.ok) {
      return getResult
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('entries')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    // 共有投稿の場合は達成レコードも削除
    if (getResult.value.is_shared) {
      await deleteSharedEntryAchievement(
        getResult.value.user_id,
        id
      ).catch((err) => {
        console.error('達成削除失敗:', err instanceof Error ? err.message : err)
      })
    }

    // タイムラインとソーシャルページのSSRキャッシュを無効化
    revalidatePath('/timeline')
    revalidatePath('/social')

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
}

/**
 * IDでエントリを取得
 */
export async function getEntry(id: string): Promise<Result<Entry, EntryError>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('entries')
      .select()
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: '記録が見つかりません' }
      }
    }

    return { ok: true, value: data as Entry }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
}

