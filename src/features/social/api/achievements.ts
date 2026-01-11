'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getJSTDayBounds } from '@/lib/date-utils'
import { logger } from '@/lib/logger'
import type { Achievement, AchievementType, SocialResult } from '../types'
import { ACHIEVEMENT_THRESHOLDS } from '../constants'

/**
 * 当日のエントリー数を取得
 */
async function getTodayEntryCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { start, end } = getJSTDayBounds()

  const { count, error } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())

  if (error) {
    logger.error('当日エントリー数取得エラー', error.message)
    return 0
  }

  return count ?? 0
}

/**
 * 総エントリー数を取得
 */
async function getTotalEntryCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_deleted', false)

  if (error) {
    logger.error('総エントリー数取得エラー', error.message)
    return 0
  }

  return count ?? 0
}

/**
 * 現在のストリーク数を取得
 */
async function getCurrentStreak(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  if (error) {
    // レコードが存在しない場合は0を返す
    return 0
  }

  return data?.current_streak ?? 0
}

/**
 * 同じ日に同じタイプ・閾値の達成が既にあるかチェック
 */
async function hasExistingDailyAchievement(
  userId: string,
  type: AchievementType,
  threshold: number
): Promise<boolean> {
  const adminClient = createAdminClient()
  const { start, end } = getJSTDayBounds()

  const { data, error } = await adminClient
    .from('achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('threshold', threshold)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .maybeSingle()

  if (error) {
    logger.error('既存達成チェックエラー', error.message)
    return true // エラー時は作成しない
  }

  return data !== null
}

/**
 * 同じタイプ・閾値の達成が既にあるかチェック（総投稿数、継続日数用）
 */
async function hasExistingAchievement(
  userId: string,
  type: AchievementType,
  threshold: number
): Promise<boolean> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('threshold', threshold)
    .maybeSingle()

  if (error) {
    logger.error('既存達成チェックエラー', error.message)
    return true // エラー時は作成しない
  }

  return data !== null
}

/**
 * 達成チェック・作成の共通ロジック
 * @param isDailyCheck trueなら当日チェック、falseなら全期間チェック
 */
async function checkAndCreateAchievementForType(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  type: AchievementType,
  currentValue: number,
  thresholds: readonly number[],
  entryId: string,
  isDailyCheck: boolean
): Promise<Achievement | null> {
  for (const threshold of thresholds) {
    if (currentValue === threshold) {
      const exists = isDailyCheck
        ? await hasExistingDailyAchievement(userId, type, threshold)
        : await hasExistingAchievement(userId, type, threshold)

      if (!exists) {
        const { data, error } = await adminClient
          .from('achievements')
          .insert({
            user_id: userId,
            type,
            threshold,
            value: currentValue,
            entry_id: entryId,
            is_shared: false,
          })
          .select()
          .single()

        if (error) {
          logger.error(`${type}達成作成エラー`, error.message)
          return null
        }

        if (data) {
          return mapToAchievement(data)
        }
      }
    }
  }
  return null
}

/**
 * 達成をチェックして作成
 * エントリ作成時に呼び出す
 */
export async function checkAndCreateAchievements(
  userId: string,
  entryId: string,
  isShared: boolean = false
): Promise<SocialResult<Achievement[]>> {
  try {
    // 認証チェック: 渡されたuserIdが認証ユーザーと一致することを確認
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    if (userData.user.id !== userId) {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: '他のユーザーの達成を作成する権限がありません' },
      }
    }

    const adminClient = createAdminClient()
    const newAchievements: Achievement[] = []

    // 1. 共有投稿の場合は共有達成を作成
    if (isShared) {
      const { data: sharedAchievement, error: sharedError } = await adminClient
        .from('achievements')
        .insert({
          user_id: userId,
          type: 'shared_entry',
          threshold: 1,
          value: 1,
          entry_id: entryId,
          is_shared: true,
        })
        .select()
        .single()

      if (sharedError) {
        logger.error('共有達成作成エラー', sharedError.message)
      } else if (sharedAchievement) {
        newAchievements.push(mapToAchievement(sharedAchievement))
      }
    }

    // 2. 1日の投稿数チェック
    const todayCount = await getTodayEntryCount(userId)
    const dailyAchievement = await checkAndCreateAchievementForType(
      adminClient,
      userId,
      'daily_posts',
      todayCount,
      ACHIEVEMENT_THRESHOLDS.daily_posts,
      entryId,
      true // 当日チェック
    )
    if (dailyAchievement) {
      newAchievements.push(dailyAchievement)
    }

    // 3. 総投稿数チェック
    const totalCount = await getTotalEntryCount(userId)
    const totalAchievement = await checkAndCreateAchievementForType(
      adminClient,
      userId,
      'total_posts',
      totalCount,
      ACHIEVEMENT_THRESHOLDS.total_posts,
      entryId,
      false // 全期間チェック
    )
    if (totalAchievement) {
      newAchievements.push(totalAchievement)
    }

    // 4. 継続日数チェック
    const currentStreak = await getCurrentStreak(userId)
    const streakAchievement = await checkAndCreateAchievementForType(
      adminClient,
      userId,
      'streak_days',
      currentStreak,
      ACHIEVEMENT_THRESHOLDS.streak_days,
      entryId,
      false // 全期間チェック
    )
    if (streakAchievement) {
      newAchievements.push(streakAchievement)
    }

    return { ok: true, value: newAchievements }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 共有エントリの達成レコードを削除
 * 共有→非共有に変更した時に呼び出す
 */
export async function deleteSharedEntryAchievement(
  userId: string,
  entryId: string
): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    if (userData.user.id !== userId) {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: '他のユーザーの達成を削除する権限がありません' },
      }
    }

    const adminClient = createAdminClient()

    // shared_entry タイプの達成レコードを削除
    const { error } = await adminClient
      .from('achievements')
      .delete()
      .eq('user_id', userId)
      .eq('entry_id', entryId)
      .eq('type', 'shared_entry')

    if (error) {
      logger.error('共有達成削除エラー', error.message)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 共有投稿の achievements レコードを touch（updated_at 更新）
 * 投稿内容・画像編集時に Realtime UPDATE イベントを発火させるため
 */
export async function touchSharedEntryAchievement(
  userId: string,
  entryId: string
): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    if (userData.user.id !== userId) {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: '他のユーザーの達成を更新する権限がありません' },
      }
    }

    const adminClient = createAdminClient()

    // shared_entry タイプの達成レコードの updated_at を更新
    // トリガーにより updated_at が自動で NOW() に設定される
    const { error } = await adminClient
      .from('achievements')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('entry_id', entryId)
      .eq('type', 'shared_entry')

    if (error) {
      logger.error('共有達成touchエラー', error.message)
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 達成をお祝い
 */
export async function celebrateAchievement(achievementId: string): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // 達成情報を取得
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('id, user_id')
      .eq('id', achievementId)
      .single()

    if (achievementError || !achievement) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: '達成が見つかりません' },
      }
    }

    // お祝いを作成
    const { error: celebrateError } = await supabase.from('celebrations').insert({
      achievement_id: achievementId,
      from_user_id: userData.user.id,
    })

    if (celebrateError) {
      if (celebrateError.code === '23505') {
        return {
          ok: false,
          error: { code: 'ALREADY_CELEBRATED', message: '既にお祝い済みです' },
        }
      }
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: celebrateError.message },
      }
    }

    // 通知を作成（admin clientでRLSをバイパス）
    const adminClient = createAdminClient()
    await adminClient.from('social_notifications').insert({
      user_id: achievement.user_id,
      type: 'celebration',
      from_user_id: userData.user.id,
      achievement_id: achievementId,
    })

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * お祝いを取り消し
 */
export async function uncelebrateAchievement(achievementId: string): Promise<SocialResult<void>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    const { error, count } = await supabase
      .from('celebrations')
      .delete()
      .eq('achievement_id', achievementId)
      .eq('from_user_id', userData.user.id)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    if (count === 0) {
      return {
        ok: false,
        error: { code: 'NOT_CELEBRATED', message: 'お祝いしていません' },
      }
    }

    return { ok: true, value: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

/**
 * 自分が受け取ったお祝い総数を取得
 */
export async function getMyCelebrationCount(): Promise<SocialResult<number>> {
  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHORIZED', message: '未認証です' },
      }
    }

    // 自分の達成に対するお祝いの数をカウント
    const { count, error } = await supabase
      .from('celebrations')
      .select('*, achievements!inner(user_id)', { count: 'exact', head: true })
      .eq('achievements.user_id', userData.user.id)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message },
      }
    }

    return { ok: true, value: count ?? 0 }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    }
  }
}

// DBレコードをAchievement型にマッピング
function mapToAchievement(data: {
  id: string
  user_id: string
  type: string
  threshold: number
  value: number
  entry_id: string | null
  is_shared: boolean
  created_at: string
}): Achievement {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type as AchievementType,
    threshold: data.threshold,
    value: data.value,
    entryId: data.entry_id,
    isShared: data.is_shared,
    createdAt: data.created_at,
  }
}
