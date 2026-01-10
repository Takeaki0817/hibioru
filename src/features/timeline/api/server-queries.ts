'use server'

import { createClient } from '@/lib/supabase/server'
import { transformToSignedUrls } from '@/lib/supabase/signed-url'
import { getJSTDateString } from '@/lib/date-utils'
import type { Entry } from '@/lib/types/database'
import type { TimelinePage, TimelineEntry } from '../types'

/**
 * エントリをTimelineEntry型に変換（署名付きURL含む）
 */
async function convertWithSignedUrls(
  entry: Entry,
  currentUserId: string
): Promise<TimelineEntry> {
  const signedUrls = await transformToSignedUrls(
    entry.image_urls,
    currentUserId,
    entry.user_id
  )
  const createdAt = new Date(entry.created_at)

  return {
    id: entry.id,
    userId: entry.user_id,
    content: entry.content,
    imageUrls: signedUrls,
    createdAt,
    date: getJSTDateString(createdAt),
  }
}

export interface FetchEntriesParams {
  userId: string
  cursor?: string // created_atのISO文字列
  limit?: number
  direction?: 'before' | 'after'
}

/**
 * タイムラインエントリを取得（署名付きURL変換込み）
 * サーバーサイドで実行される
 */
export async function fetchTimelineEntries(
  params: FetchEntriesParams
): Promise<TimelinePage> {
  const { userId, cursor, limit = 20, direction = 'before' } = params
  const supabase = await createClient()

  let query = supabase
    .from('entries')
    .select('id, user_id, content, image_urls, is_shared, created_at')
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
  const rawEntries = (hasMore ? data.slice(0, limit) : data) as unknown as Entry[]

  // TimelineEntry型に変換（署名付きURL含む）
  const timelineEntries = await Promise.all(
    rawEntries.map((entry) => convertWithSignedUrls(entry, userId))
  )

  return {
    entries: timelineEntries,
    nextCursor: hasMore ? rawEntries[rawEntries.length - 1].created_at : null,
    prevCursor: rawEntries[0]?.created_at || null,
  }
}

/**
 * 今日のエントリを取得（署名付きURL変換込み）
 * タイムラインページの初期データ用
 */
export async function fetchTodayEntries(userId: string): Promise<TimelineEntry[]> {
  const supabase = await createClient()

  // 今日の日付範囲を取得
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('entries')
    .select('id, user_id, content, image_urls, is_shared, created_at')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`エントリ取得失敗: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // 署名付きURLに変換
  const entries = await Promise.all(
    (data as Entry[]).map((entry) => convertWithSignedUrls(entry, userId))
  )

  return entries
}
