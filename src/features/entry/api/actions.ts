'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { authActionClient } from '@/lib/safe-action'
import { logger } from '@/lib/logger'
import { BusinessLogicError } from '@/lib/errors'
import { rateLimits, checkRateLimit, getRateLimitErrorMessage } from '@/lib/rate-limit'
import type { EntryInsert, EntryUpdate } from '@/lib/types/database'
import type { Entry } from '../types'
import { isEditable } from '../utils'
import { handleEntryCreated } from '@/features/notification/api/entry-integration'
import { updateStreakOnEntry } from '@/features/streak/api/service'
import {
  checkAndCreateAchievements,
  deleteSharedEntryAchievement,
  touchSharedEntryAchievement,
} from '@/features/social/api/achievements'
import { checkEntryLimit, checkImageLimit } from '@/features/billing/api/plan-limits'

// 入力スキーマ
const createEntrySchema = z.object({
  content: z.string().min(1, '内容を入力してください'),
  imageUrls: z.array(z.string()).nullable().optional(),
  isShared: z.boolean().optional().default(false),
})

const updateEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, '内容を入力してください'),
  imageUrls: z.array(z.string()).nullable().optional(),
  isShared: z.boolean().optional(),
})

const deleteEntrySchema = z.object({
  id: z.string().uuid(),
})

/**
 * IDでエントリを取得（内部ユーティリティ）
 */
async function getEntryInternal(id: string): Promise<Entry> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entries')
    .select()
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error) {
    throw new Error('エントリが見つかりません')
  }

  return data as Entry
}

/**
 * 新規エントリを作成
 *
 * エントリー作成成功時に以下の通知連携処理を実行します:
 * - 当日の通知ログのentry_recorded_atを更新（Requirement 6.1）
 * - 追いリマインドのキャンセル（Requirement 4.4）
 */
export const createEntry = authActionClient
  .inputSchema(createEntrySchema)
  .action(async ({ parsedInput: input, ctx: { user, supabase } }) => {
    // 空白のみのコンテンツをチェック
    if (input.content.trim().length === 0) {
      throw new BusinessLogicError('内容を入力してください')
    }

    // レート制限チェック
    const rateCheck = await checkRateLimit(rateLimits.entryCreate, user.id)
    if (!rateCheck.success) {
      throw new BusinessLogicError(getRateLimitErrorMessage(rateCheck.resetAt))
    }

    // 投稿制限チェック・画像制限チェックを並列実行
    const [entryLimitResult, imageLimitResult] = await Promise.all([
      checkEntryLimit(user.id),
      input.imageUrls && input.imageUrls.length > 0
        ? checkImageLimit(user.id)
        : Promise.resolve({ ok: true as const, value: { allowed: true, limit: 0, current: 0 } }),
    ])

    // 投稿制限バリデーション
    if (!entryLimitResult.ok) {
      logger.error('投稿制限チェック失敗', entryLimitResult.error)
      throw new Error('制限チェックに失敗しました')
    }
    if (!entryLimitResult.value.allowed) {
      throw new BusinessLogicError(`本日の投稿上限（${entryLimitResult.value.limit}件）に達しました`)
    }

    // 画像制限バリデーション
    if (!imageLimitResult.ok) {
      logger.error('画像制限チェック失敗', imageLimitResult.error)
      throw new Error('制限チェックに失敗しました')
    }
    if (!imageLimitResult.value.allowed) {
      throw new BusinessLogicError(`今月の画像上限（${imageLimitResult.value.limit}枚）に達しました`)
    }

    const insertData: EntryInsert = {
      user_id: user.id,
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
      logger.error('エントリ作成失敗', error)
      throw new Error('エントリの作成に失敗しました')
    }

    const entry = data as Entry

    // 副作用を非同期で実行（Fire-and-Forget）
    // エントリ作成の成功をすぐに返すため、完了を待機しない
    const effectNames = ['updateStreakOnEntry', 'handleEntryCreated', 'checkAndCreateAchievements']
    void Promise.allSettled([
      updateStreakOnEntry(user.id),
      handleEntryCreated({
        userId: user.id,
        entryId: entry.id,
        createdAt: new Date(entry.created_at),
      }),
      checkAndCreateAchievements(user.id, entry.id, input.isShared ?? false),
    ]).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`副作用失敗: ${effectNames[index]}`, result.reason)
        }
      })
    })

    // タイムラインとソーシャルページのSSRキャッシュを無効化
    revalidatePath('/timeline')
    revalidatePath('/social')

    return entry
  })

/**
 * エントリを更新
 */
export const updateEntry = authActionClient
  .inputSchema(updateEntrySchema)
  .action(async ({ parsedInput: input, ctx: { supabase } }) => {
    // 既存エントリを取得して編集可能かチェック
    const existingEntry = await getEntryInternal(input.id)

    if (!isEditable(existingEntry)) {
      throw new BusinessLogicError('編集可能期間（24時間）を過ぎています')
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
      .eq('id', input.id)
      .select()
      .single()

    if (error) {
      logger.error('エントリ更新失敗', error)
      throw new Error('エントリの更新に失敗しました')
    }

    const entry = data as Entry

    // 共有状態の変更を処理
    if (!existingEntry.is_shared && input.isShared) {
      // 非共有→共有: 達成レコードを作成
      await checkAndCreateAchievements(
        existingEntry.user_id,
        input.id,
        true
      ).catch((err) => {
        logger.error('達成チェック失敗', err)
      })
    } else if (existingEntry.is_shared && !input.isShared) {
      // 共有→非共有: 達成レコードを削除
      await deleteSharedEntryAchievement(
        existingEntry.user_id,
        input.id
      ).catch((err) => {
        logger.error('達成削除失敗', err)
      })
    } else if (existingEntry.is_shared && input.isShared) {
      // 共有状態を維持したまま内容を編集: achievements の updated_at を更新
      // これにより Realtime UPDATE イベントが発火し、フォロワーのフィードが更新される
      await touchSharedEntryAchievement(
        existingEntry.user_id,
        input.id
      ).catch((err) => {
        logger.error('達成touch失敗', err)
      })
    }

    // タイムラインとソーシャルページのSSRキャッシュを無効化
    revalidatePath('/timeline')
    revalidatePath('/social')

    return entry
  })

/**
 * エントリを論理削除
 */
export const deleteEntry = authActionClient
  .inputSchema(deleteEntrySchema)
  .action(async ({ parsedInput: { id }, ctx: { user, supabase } }) => {
    // 削除前にエントリ情報を取得（共有状態確認のため）
    const entry = await getEntryInternal(id)

    // 権限チェック: 自分のエントリのみ削除可能
    if (entry.user_id !== user.id) {
      throw new BusinessLogicError('このエントリを削除する権限がありません')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('entries')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      logger.error('エントリ削除失敗', error)
      throw new Error('エントリの削除に失敗しました')
    }

    // 共有投稿の場合は達成レコードも削除
    if (entry.is_shared) {
      await deleteSharedEntryAchievement(
        entry.user_id,
        id
      ).catch((err) => {
        logger.error('達成削除失敗', err)
      })
    }

    // タイムラインとソーシャルページのSSRキャッシュを無効化
    revalidatePath('/timeline')
    revalidatePath('/social')

    return { success: true }
  })
