/**
 * useTimelineGrouping フックのユニットテスト
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react'
import { useTimelineGrouping } from '../use-timeline-grouping'
import type { TimelineEntry } from '../../types'

// テスト用エントリーデータ作成ヘルパー
const createMockEntry = (overrides: Partial<TimelineEntry> = {}): TimelineEntry => ({
  id: `entry-${Math.random().toString(36).slice(2)}`,
  userId: 'user-1',
  content: 'テスト投稿',
  imageUrls: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  date: '2024-01-15',
  ...overrides,
})

// フック内部でnew Date()を使用するため、日付をモックする
const MOCK_TODAY = new Date('2024-01-20T12:00:00Z')

describe('useTimelineGrouping', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(MOCK_TODAY)
  })

  afterEach(() => {
    jest.useRealTimers()
  })
  describe('エントリがない場合', () => {
    it('今日のみを返すこと', () => {
      // Arrange
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries: [],
          todayStr,
          displayedDateCount: 5,
        })
      )

      // Assert
      expect(result.current.allDates).toEqual([todayStr])
      expect(result.current.displayedDates).toEqual([todayStr])
      expect(result.current.groupedEntries.size).toBe(0)
      expect(result.current.activeDatesSet.has(todayStr)).toBe(true)
    })
  })

  describe('日付グループ化', () => {
    it('エントリを正しく日付ごとにグループ化すること', () => {
      // Arrange
      const entries: TimelineEntry[] = [
        createMockEntry({ id: 'entry-1', date: '2024-01-15', createdAt: new Date('2024-01-15T10:00:00Z') }),
        createMockEntry({ id: 'entry-2', date: '2024-01-15', createdAt: new Date('2024-01-15T14:00:00Z') }),
        createMockEntry({ id: 'entry-3', date: '2024-01-16', createdAt: new Date('2024-01-16T09:00:00Z') }),
      ]
      const todayStr = '2024-01-16'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 10,
        })
      )

      // Assert
      expect(result.current.groupedEntries.size).toBe(2)
      expect(result.current.groupedEntries.get('2024-01-15')?.length).toBe(2)
      expect(result.current.groupedEntries.get('2024-01-16')?.length).toBe(1)
    })

    it('同じ日付のエントリが同じグループに含まれること', () => {
      // Arrange
      const entries: TimelineEntry[] = [
        createMockEntry({ id: 'entry-1', date: '2024-01-15', content: '朝の投稿' }),
        createMockEntry({ id: 'entry-2', date: '2024-01-15', content: '昼の投稿' }),
        createMockEntry({ id: 'entry-3', date: '2024-01-15', content: '夜の投稿' }),
      ]
      const todayStr = '2024-01-15'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 5,
        })
      )

      // Assert
      const entriesOnDate = result.current.groupedEntries.get('2024-01-15')
      expect(entriesOnDate?.length).toBe(3)
      expect(entriesOnDate?.map((e) => e.id)).toEqual(['entry-1', 'entry-2', 'entry-3'])
    })
  })

  describe('全日付リスト計算', () => {
    it('空の日付を含む連続した日付リストを生成すること', () => {
      // Arrange
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-10' }),
        createMockEntry({ date: '2024-01-15' }),
      ]
      // todayStrは2024-01-20（MOCK_TODAY）
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 20,
        })
      )

      // Assert: 1/10から1/20までの11日間（今日までの連続した日付）
      expect(result.current.allDates.length).toBe(11)
      expect(result.current.allDates[0]).toBe('2024-01-10')
      expect(result.current.allDates[10]).toBe('2024-01-20')
      // 中間の日付も含まれている
      expect(result.current.allDates).toContain('2024-01-12')
      expect(result.current.allDates).toContain('2024-01-15')
    })

    it('古い順にソートされること', () => {
      // Arrange
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
        createMockEntry({ date: '2024-01-10' }),
        createMockEntry({ date: '2024-01-12' }),
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 20,
        })
      )

      // Assert: 古い順（最古のエントリから今日まで）
      expect(result.current.allDates[0]).toBe('2024-01-10')
      expect(result.current.allDates[result.current.allDates.length - 1]).toBe('2024-01-20')
    })

    it('エントリが今日より未来の場合もその日まで含むこと', () => {
      // Arrange: 今日(1/20)より未来のエントリ
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-18' }),
        createMockEntry({ date: '2024-01-25' }), // 今日より未来
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 20,
        })
      )

      // Assert: 1/18から1/25までの8日間
      expect(result.current.allDates.length).toBe(8)
      expect(result.current.allDates[0]).toBe('2024-01-18')
      expect(result.current.allDates[result.current.allDates.length - 1]).toBe('2024-01-25')
    })
  })

  describe('表示日付の計算', () => {
    it('displayedDateCountに基づいて表示日付を制限すること', () => {
      // Arrange: 今日は2024-01-20
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 3,
        })
      )

      // Assert: 1/15から1/20までの6日間があり、最新3日分のみ表示
      expect(result.current.allDates.length).toBe(6)
      expect(result.current.displayedDates.length).toBe(3)
      expect(result.current.displayedDates).toEqual(['2024-01-18', '2024-01-19', '2024-01-20'])
    })

    it('全日付数がdisplayedDateCount以下の場合は全て表示すること', () => {
      // Arrange: 今日は2024-01-20、エントリは2024-01-18から
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-18' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 10,
        })
      )

      // Assert: 3日分全て表示（displayedDateCount=10以下）
      expect(result.current.allDates.length).toBe(3)
      expect(result.current.displayedDates.length).toBe(3)
      expect(result.current.displayedDates).toEqual(result.current.allDates)
    })
  })

  describe('initialDate指定時の動作', () => {
    it('initialDateから最新までを表示すること', () => {
      // Arrange: 今日は2024-01-20
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-10' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'
      const initialDate = new Date('2024-01-15T00:00:00Z')

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 3,
          initialDate,
        })
      )

      // Assert: 1/15から1/20までの6日分（displayedDateCount=3より多い）
      expect(result.current.displayedDates.length).toBe(6)
      expect(result.current.displayedDates[0]).toBe('2024-01-15')
      expect(result.current.displayedDates[result.current.displayedDates.length - 1]).toBe('2024-01-20')
    })

    it('initialDateがdisplayedDateCount内の場合はdisplayedDateCountを優先すること', () => {
      // Arrange: 今日は2024-01-20
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-10' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'
      const initialDate = new Date('2024-01-19T00:00:00Z') // displayedDateCount=5内

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 5,
          initialDate,
        })
      )

      // Assert: initialDateから最新まで2日、displayedDateCount=5が適用される
      expect(result.current.displayedDates.length).toBe(5)
    })

    it('initialDateが範囲外の場合はデフォルト動作すること', () => {
      // Arrange: 今日は2024-01-20、最古のエントリは2024-01-15
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'
      const initialDate = new Date('2024-01-10T00:00:00Z') // 範囲外（最古のエントリより前）

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 3,
          initialDate,
        })
      )

      // Assert: デフォルト動作（最新3日分）
      expect(result.current.displayedDates.length).toBe(3)
      expect(result.current.displayedDates[result.current.displayedDates.length - 1]).toBe('2024-01-20')
    })
  })

  describe('dateIndexMap', () => {
    it('O(1)で日付インデックスを取得できること', () => {
      // Arrange: 今日は2024-01-20
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 20,
        })
      )

      // Assert: 1/15から1/20までの6日間
      expect(result.current.dateIndexMap.get('2024-01-15')).toBe(0)
      expect(result.current.dateIndexMap.get('2024-01-17')).toBe(2)
      expect(result.current.dateIndexMap.get('2024-01-20')).toBe(5)
      // 存在しない日付はundefined
      expect(result.current.dateIndexMap.get('2024-01-14')).toBeUndefined()
    })

    it('全日付がマップに含まれること', () => {
      // Arrange: 今日は2024-01-20
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-18' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 20,
        })
      )

      // Assert
      expect(result.current.dateIndexMap.size).toBe(result.current.allDates.length)
      for (const [date, index] of result.current.dateIndexMap) {
        expect(result.current.allDates[index]).toBe(date)
      }
    })
  })

  describe('activeDatesSet', () => {
    it('全日付がSetに含まれること', () => {
      // Arrange: 今日は2024-01-20
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-18' }),
        createMockEntry({ date: '2024-01-20' }),
      ]
      const todayStr = '2024-01-20'

      // Act
      const { result } = renderHook(() =>
        useTimelineGrouping({
          entries,
          todayStr,
          displayedDateCount: 20,
        })
      )

      // Assert
      expect(result.current.activeDatesSet.size).toBe(result.current.allDates.length)
      for (const date of result.current.allDates) {
        expect(result.current.activeDatesSet.has(date)).toBe(true)
      }
    })
  })

  describe('メモ化', () => {
    it('entriesが同じ場合はgroupedEntriesが同じ参照を返すこと', () => {
      // Arrange
      const entries: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
      ]
      const todayStr = '2024-01-15'

      // Act
      const { result, rerender } = renderHook(
        ({ entries, todayStr }) =>
          useTimelineGrouping({
            entries,
            todayStr,
            displayedDateCount: 5,
          }),
        { initialProps: { entries, todayStr } }
      )

      const initialGroupedEntries = result.current.groupedEntries

      // 同じentriesでrerender
      rerender({ entries, todayStr })

      // Assert: 同じ参照
      expect(result.current.groupedEntries).toBe(initialGroupedEntries)
    })

    it('entriesが変わった場合はgroupedEntriesが新しい参照を返すこと', () => {
      // Arrange
      const entries1: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
      ]
      const entries2: TimelineEntry[] = [
        createMockEntry({ date: '2024-01-15' }),
        createMockEntry({ date: '2024-01-16' }),
      ]
      const todayStr = '2024-01-16'

      // Act
      const { result, rerender } = renderHook(
        ({ entries }) =>
          useTimelineGrouping({
            entries,
            todayStr,
            displayedDateCount: 5,
          }),
        { initialProps: { entries: entries1 } }
      )

      const initialGroupedEntries = result.current.groupedEntries

      // 異なるentriesでrerender
      rerender({ entries: entries2 })

      // Assert: 新しい参照
      expect(result.current.groupedEntries).not.toBe(initialGroupedEntries)
    })
  })
})
