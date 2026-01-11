import { createClient } from '@/lib/supabase/client'
import { isoToJSTDateString } from '@/lib/date-utils'
import { logger } from '@/lib/logger'
import type { Entry } from '@/lib/types/database'
import type { TimelinePage } from '../types'
import { convertToTimelineEntry } from '../types'

export interface FetchEntriesParams {
  userId: string
  cursor?: string // created_atのISO文字列
  limit?: number
  direction?: 'before' | 'after'
}

// 投稿データの取得
export async function fetchEntries(
  params: FetchEntriesParams
): Promise<TimelinePage> {
  const { userId, cursor, limit = 20, direction = 'before' } = params
  const supabase = createClient()

  let query = supabase
    .from('entries')
    .select('id, user_id, content, image_urls, created_at')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // 次のページがあるか判定するため+1

  // カーソルベースのページネーション
  if (cursor) {
    if (direction === 'before') {
      query = query.lt('created_at', cursor)
    } else {
      query = query.gt('created_at', cursor)
    }
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`投稿の取得に失敗しました: ${error.message}`)
  }

  if (!data) {
    return {
      entries: [],
      nextCursor: null,
      prevCursor: null,
    }
  }

  // limit+1件取得しているので、次のページの有無を判定
  const hasMore = data.length > limit
  // selectで必要カラムのみ取得しているのでEntry型とは一致しない
  const rawEntries = (hasMore ? data.slice(0, limit) : data) as unknown as Entry[]

  // TimelineEntry型に変換
  const timelineEntries = rawEntries.map(convertToTimelineEntry)

  return {
    entries: timelineEntries,
    nextCursor: hasMore ? rawEntries[rawEntries.length - 1].created_at : null,
    prevCursor: rawEntries[0]?.created_at || null,
  }
}

// カレンダー表示用のデータ取得
export interface FetchCalendarDataParams {
  userId: string
  year: number
  month: number // 1-12
}

export interface FetchCalendarDataResponse {
  entryDates: string[] // YYYY-MM-DD[]
  hotsureDates: string[] // YYYY-MM-DD[]
}

export async function fetchCalendarData(
  params: FetchCalendarDataParams
): Promise<FetchCalendarDataResponse> {
  const { userId, year, month } = params
  const supabase = createClient()

  // 月の最初と最後の日を計算
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  // entries と streaks を並列取得（パフォーマンス最適化）
  const [entriesResult, streaksResult] = await Promise.all([
    supabase
      .from('entries')
      .select('created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString()),
    supabase
      .from('streaks')
      .select('hotsure_used_dates')
      .eq('user_id', userId)
      .single()
  ])

  if (entriesResult.error) {
    throw new Error(`カレンダーデータの取得に失敗しました: ${entriesResult.error.message}`)
  }

  // streaksのエラーはログのみ（エントリがあればカレンダー表示は可能）
  if (streaksResult.error) {
    logger.error('ストリーク取得失敗', streaksResult.error.message)
  }

  // 日付ごとにグループ化
  const rawEntries = entriesResult.data as { created_at: string }[] | null
  const entryDates = Array.from(
    new Set(
      (rawEntries || []).map((entry) => isoToJSTDateString(entry.created_at))
    )
  )

  const streakData = streaksResult.error
    ? null
    : (streaksResult.data as { hotsure_used_dates: string[] } | null)
  const hotsureDates = streakData?.hotsure_used_dates || []

  return {
    entryDates,
    hotsureDates,
  }
}

// カルーセル用: 全期間の投稿日付を取得（日付のみ、軽量）
export interface FetchAllEntryDatesParams {
  userId: string
}

export interface FetchAllEntryDatesResponse {
  entryDates: string[] // YYYY-MM-DD[]
  hotsureDates: string[] // YYYY-MM-DD[]
}

export async function fetchAllEntryDates(
  params: FetchAllEntryDatesParams
): Promise<FetchAllEntryDatesResponse> {
  const { userId } = params
  const supabase = createClient()

  // entries と streaks を並列取得
  const [entriesResult, streaksResult] = await Promise.all([
    supabase
      .from('entries')
      .select('created_at')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('streaks')
      .select('hotsure_used_dates')
      .eq('user_id', userId)
      .single()
  ])

  if (entriesResult.error) {
    throw new Error(`投稿日付の取得に失敗しました: ${entriesResult.error.message}`)
  }

  // streaksのエラーはログのみ（エントリがあればカルーセル表示は可能）
  if (streaksResult.error) {
    logger.error('ストリーク取得失敗', streaksResult.error.message)
  }

  // 日付ごとにグループ化（重複除去）
  const rawEntries = entriesResult.data as { created_at: string }[] | null
  const entryDates = Array.from(
    new Set(
      (rawEntries || []).map((entry) => isoToJSTDateString(entry.created_at))
    )
  )

  const streakData = streaksResult.error
    ? null
    : (streaksResult.data as { hotsure_used_dates: string[] } | null)
  const hotsureDates = streakData?.hotsure_used_dates || []

  return {
    entryDates,
    hotsureDates,
  }
}
