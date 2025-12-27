'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getJSTToday, getJSTDateString } from '@/lib/date-utils'
import type { StreakInsert } from '@/lib/types/database'
import type { StreakInfo, StreakError, Result } from '../types'

/**
 * ストリーク情報を取得
 */
export async function getStreakInfo(
  userId: string
): Promise<Result<StreakInfo, StreakError>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // レコードが存在しない場合は初期値で作成
      if (error.code === 'PGRST116') {
        const initialStreak: StreakInfo = {
          currentStreak: 0,
          longestStreak: 0,
          lastEntryDate: null,
          hotsureRemaining: 2,
          hotsureUsedCount: 0
        }
        return { ok: true, value: initialStreak }
      }
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    const streakData = data as {
      current_streak: number
      longest_streak: number
      last_entry_date: string | null
      hotsure_remaining: number
      hotsure_used_dates: string[]
    }

    return {
      ok: true,
      value: {
        currentStreak: streakData.current_streak,
        longestStreak: streakData.longest_streak,
        lastEntryDate: streakData.last_entry_date,
        hotsureRemaining: streakData.hotsure_remaining,
        hotsureUsedCount: streakData.hotsure_used_dates?.length || 0
      }
    }
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
 * 記録作成時にストリークを更新
 */
export async function updateStreakOnEntry(
  userId: string
): Promise<Result<StreakInfo, StreakError>> {
  try {
    const supabase = await createClient()
    const today = getJSTToday()

    // 現在のストリーク情報を取得
    const { data: existing, error: fetchError } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates')
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: fetchError.message }
      }
    }

    const streakData = existing as {
      current_streak: number
      longest_streak: number
      last_entry_date: string | null
      hotsure_remaining: number
      hotsure_used_dates: string[]
    } | null

    // 同日2回目以降の記録の場合は更新しない（現在の情報をそのまま返す）
    if (streakData?.last_entry_date === today) {
      return {
        ok: true,
        value: {
          currentStreak: streakData.current_streak,
          longestStreak: streakData.longest_streak,
          lastEntryDate: streakData.last_entry_date,
          hotsureRemaining: streakData.hotsure_remaining,
          hotsureUsedCount: streakData.hotsure_used_dates?.length || 0
        }
      }
    }

    // 新しいストリーク値を計算
    const newCurrentStreak = (streakData?.current_streak || 0) + 1
    const newLongestStreak = Math.max(
      newCurrentStreak,
      streakData?.longest_streak || 0
    )

    // 更新または作成（.select()で更新後のデータを取得）
    const updateData: StreakInsert = {
      user_id: userId,
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_entry_date: today
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedData, error: updateError } = await (supabase as any)
      .from('streaks')
      .upsert(updateData)
      .select('current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates')
      .single()

    if (updateError) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: updateError.message }
      }
    }

    const updated = updatedData as {
      current_streak: number
      longest_streak: number
      last_entry_date: string | null
      hotsure_remaining: number
      hotsure_used_dates: string[]
    }

    return {
      ok: true,
      value: {
        currentStreak: updated.current_streak,
        longestStreak: updated.longest_streak,
        lastEntryDate: updated.last_entry_date,
        hotsureRemaining: updated.hotsure_remaining,
        hotsureUsedCount: updated.hotsure_used_dates?.length || 0
      }
    }
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
 * 指定日の記録有無を確認
 */
export async function hasEntryOnDate(
  userId: string,
  date: string
): Promise<Result<boolean, StreakError>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', `${date}T00:00:00+09:00`)
      .lt('created_at', `${date}T23:59:59+09:00`)
      .limit(1)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

    return { ok: true, value: (data?.length || 0) > 0 }
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
 * 今週（月〜日）の記録有無を取得
 * @returns [月, 火, 水, 木, 金, 土, 日] の boolean 配列
 */
export async function getWeeklyRecords(
  userId: string
): Promise<Result<boolean[], StreakError>> {
  try {
    const today = getJSTToday()
    const todayDate = new Date(`${today}T00:00:00+09:00`)

    // 今日の曜日（0=月曜, 6=日曜）
    const dayOfWeek = (todayDate.getUTCDay() + 6) % 7

    // 今週の月曜日を計算
    const mondayDate = new Date(todayDate)
    mondayDate.setUTCDate(mondayDate.getUTCDate() - dayOfWeek)

    // 月〜日の7日分の日付配列を生成
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate)
      date.setUTCDate(date.getUTCDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }

    // 日曜日の日付を計算
    const sundayDate = new Date(mondayDate)
    sundayDate.setUTCDate(sundayDate.getUTCDate() + 6)

    // 1つのクエリで1週間分のエントリを取得（N+1解消）
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('entries')
      .select('created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', `${weekDates[0]}T00:00:00+09:00`)
      .lte('created_at', `${weekDates[6]}T23:59:59+09:00`)

    if (error) {
      return {
        ok: false,
        error: {
          code: 'DB_ERROR',
          message: error.message
        }
      }
    }

    // 取得したエントリから各日付の有無を判定
    const entries = data as { created_at: string }[] | null
    const entriesByDate = new Set(
      (entries ?? []).map(e => {
        // created_at を JST の日付文字列に変換
        return getJSTDateString(new Date(e.created_at))
      })
    )

    return {
      ok: true,
      value: weekDates.map(date => entriesByDate.has(date))
    }
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
 * ストリークを途切れさせる（current_streakを0にリセット）
 */
export async function breakStreak(
  userId: string
): Promise<Result<void, StreakError>> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('streaks')
      .update({ current_streak: 0 })
      .eq('user_id', userId)

    if (error) {
      return {
        ok: false,
        error: { code: 'DB_ERROR', message: error.message }
      }
    }

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
