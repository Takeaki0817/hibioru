'use client'

import { useMemo } from 'react'
import { format, eachDayOfInterval, max, startOfDay } from 'date-fns'
import type { TimelineEntry } from '../types'

interface UseTimelineGroupingOptions {
  /** エントリーリスト */
  entries: TimelineEntry[]
  /** 今日の日付文字列（YYYY-MM-DD） */
  todayStr: string
  /** 表示日付数 */
  displayedDateCount: number
  /** 初期表示日付（指定時はその日付から最新までを含める） */
  initialDate?: Date
}

interface UseTimelineGroupingResult {
  /** 日付ごとにグループ化されたエントリー */
  groupedEntries: Map<string, TimelineEntry[]>
  /** 全日付リスト（古い順） */
  allDates: string[]
  /** 日付 → インデックスのMap（O(1)検索用） */
  dateIndexMap: Map<string, number>
  /** 表示する日付リスト */
  displayedDates: string[]
  /** 記録がある日付のSet */
  activeDatesSet: Set<string>
}

/**
 * タイムラインの日付グループ化ロジックを管理するカスタムフック
 *
 * 責務:
 * - エントリーの日付グループ化
 * - 全日付リスト計算（空の日付を含む）
 * - 表示日付の計算
 */
export function useTimelineGrouping({
  entries,
  todayStr,
  displayedDateCount,
  initialDate,
}: UseTimelineGroupingOptions): UseTimelineGroupingResult {
  // 日付ごとにエントリをグループ化
  // 同じIDのエントリが重複している場合は、最初のもののみを使用（重複を防ぐ）
  const groupedEntries = useMemo(() => {
    const grouped = new Map<string, TimelineEntry[]>()
    const seenIds = new Set<string>()
    
    for (const entry of entries) {
      // 同じIDのエントリが既に存在する場合はスキップ（重複を防ぐ）
      if (seenIds.has(entry.id)) {
        continue
      }
      seenIds.add(entry.id)
      
      const dateKey = entry.date
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(entry)
    }
    return grouped
  }, [entries])

  // 全日付リスト（古い順にソート、今日までの空の日付も含む）
  const allDates = useMemo(() => {
    const entryDates = Array.from(groupedEntries.keys())
    if (entryDates.length === 0) {
      // エントリがない場合は今日のみ
      return [todayStr]
    }

    // エントリがある日付をDateオブジェクトに変換
    const entryDateObjects = entryDates.map((d) => new Date(d))
    const today = startOfDay(new Date())

    // 最新のエントリ日付と今日の日付のうち、より新しい方を終点とする
    const latestEntryDate = max(entryDateObjects)
    const endDate = latestEntryDate > today ? latestEntryDate : today

    // 最も古いエントリ日付から今日までの全日付を生成
    const oldestEntryDate = entryDateObjects.reduce((oldest, d) =>
      d < oldest ? d : oldest
    )
    const allDateObjects = eachDayOfInterval({
      start: oldestEntryDate,
      end: endDate,
    })

    return allDateObjects.map((d) => format(d, 'yyyy-MM-dd'))
  }, [groupedEntries, todayStr])

  // 日付 → インデックスのMap（O(1)検索用）
  const dateIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    allDates.forEach((date, index) => map.set(date, index))
    return map
  }, [allDates])

  // 表示する日付（最新のN日分のみ）
  // initialDateが指定されている場合は、その日付から最新までを含める
  const displayedDates = useMemo(() => {
    // initialDateが指定されている場合、その日付から最新までを表示
    if (initialDate) {
      const initialDateStr = format(initialDate, 'yyyy-MM-dd')
      const initialIndex = dateIndexMap.get(initialDateStr) // O(1) 参照
      if (initialIndex !== undefined) {
        // initialDateから最新までの日付数を計算
        const datesAfterInitial = allDates.length - initialIndex
        const countNeeded = Math.max(datesAfterInitial, displayedDateCount)
        return allDates.slice(-countNeeded)
      }
    }

    // デフォルト：末尾からdisplayedDateCount件
    if (allDates.length <= displayedDateCount) {
      return allDates
    }
    return allDates.slice(-displayedDateCount)
  }, [allDates, dateIndexMap, displayedDateCount, initialDate])

  // 記録がある日付のSet（メモ化）
  const activeDatesSet = useMemo(() => new Set(allDates), [allDates])

  return {
    groupedEntries,
    allDates,
    dateIndexMap,
    displayedDates,
    activeDatesSet,
  }
}
