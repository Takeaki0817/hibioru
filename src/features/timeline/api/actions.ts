'use server'

import { authActionClient } from '@/lib/safe-action'
import { z } from 'zod'
import type { TimelinePage } from '../types'
import { convertToTimelineEntry } from '../types'
import type { Entry } from '@/lib/types/database'
import { isoToJSTDateString, getJSTMonthBounds, parseJSTDateString } from '@/lib/date-utils'
import { logger } from '@/lib/logger'
import type { FetchCalendarDataResponse, FetchAllEntryDatesResponse } from './queries'

const fetchEntriesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().default(20),
  direction: z.enum(['before', 'after']).default('before'),
})

export const fetchEntriesAction = authActionClient
  .schema(fetchEntriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { cursor, limit, direction } = parsedInput
    const { user, supabase } = ctx

    let query = supabase
      .from('entries')
      .select('id, user_id, content, image_urls, created_at')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

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

    const hasMore = data && data.length > limit
    const rawEntries = (hasMore ? data.slice(0, limit) : (data || [])) as unknown as Entry[]
    const timelineEntries = rawEntries.map(convertToTimelineEntry)

    return {
      entries: timelineEntries,
      nextCursor: hasMore ? rawEntries[rawEntries.length - 1].created_at : null,
      prevCursor: rawEntries[0]?.created_at || null,
    } satisfies TimelinePage
  })

// カレンダー表示用のデータ取得
const fetchCalendarDataSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
})

export const fetchCalendarDataAction = authActionClient
  .schema(fetchCalendarDataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { year, month } = parsedInput
    const { user, supabase } = ctx

    // JST基準で月の開始・終了を計算
    const referenceDate = parseJSTDateString(`${year}-${String(month).padStart(2, '0')}-15`)
    const { start: startDate, end: endDate } = getJSTMonthBounds(referenceDate)

    // entries と streaks を並列取得（パフォーマンス最適化）
    const [entriesResult, streaksResult] = await Promise.all([
      supabase
        .from('entries')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString()),
      supabase
        .from('streaks')
        .select('hotsure_used_dates')
        .eq('user_id', user.id)
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
    } satisfies FetchCalendarDataResponse
  })

// カルーセル用: 全期間の投稿日付を取得（日付のみ、軽量）
export const fetchAllEntryDatesAction = authActionClient
  .action(async ({ ctx }) => {
    const { user, supabase } = ctx

    // entries と streaks を並列取得
    const [entriesResult, streaksResult] = await Promise.all([
      supabase
        .from('entries')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('streaks')
        .select('hotsure_used_dates')
        .eq('user_id', user.id)
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
    } satisfies FetchAllEntryDatesResponse
  })
