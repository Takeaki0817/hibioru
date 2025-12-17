import { createClient } from '@/lib/supabase/client'
import type { Entry } from '@/lib/types/database'
import type { TimelinePage } from './types'
import { convertToTimelineEntry } from './types'

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
    .select('*')
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
  const rawEntries: Entry[] = hasMore ? data.slice(0, limit) : data

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

  // 投稿日を取得
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('created_at')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (entriesError) {
    throw new Error(`カレンダーデータの取得に失敗しました: ${entriesError.message}`)
  }

  // 日付ごとにグループ化
  const rawEntries = entries as { created_at: string }[] | null
  const entryDates = Array.from(
    new Set(
      (rawEntries || []).map((entry) => {
        const date = new Date(entry.created_at)
        const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
        return jstDate.toISOString().split('T')[0]
      })
    )
  )

  // ほつれ使用日を取得
  const { data: streaks } = await supabase
    .from('streaks')
    .select('hotsure_used_dates')
    .eq('user_id', userId)
    .single()

  const streakData = streaks as { hotsure_used_dates: string[] } | null
  const hotsureDates = streakData?.hotsure_used_dates || []

  return {
    entryDates,
    hotsureDates,
  }
}
