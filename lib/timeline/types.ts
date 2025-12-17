// タイムライン機能の型定義

import type { Entry } from '@/lib/types/database'

// タイムライン表示用のエントリー型
export interface TimelineEntry {
  id: string
  userId: string
  content: string
  imageUrl: string | null
  createdAt: Date
  date: string // YYYY-MM-DD形式
}

// ページネーション用のページ型
export interface TimelinePage {
  entries: TimelineEntry[]
  nextCursor: string | null
  prevCursor: string | null
}

// カレンダー表示用の日データ
export interface CalendarDayData {
  date: string // YYYY-MM-DD
  hasEntry: boolean
  isStreakDay: boolean
  hasHotsure: boolean
  isToday: boolean
}

// データベースのEntryをTimelineEntryに変換
export function convertToTimelineEntry(entry: Entry): TimelineEntry {
  const createdAt = new Date(entry.created_at)
  // 日本時間(JST)でYYYY-MM-DDを取得
  const jstDate = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000)
  const date = jstDate.toISOString().split('T')[0]

  return {
    id: entry.id,
    userId: entry.user_id,
    content: entry.content,
    imageUrl: entry.image_url,
    createdAt,
    date,
  }
}
