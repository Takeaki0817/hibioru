import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTimelineStore,
  selectIsCalendarOpen,
  selectCurrentDateString,
  selectHasEntryOnDate,
  selectHasHotsureOnDate,
} from '../timeline-store'
import type { TimelineStore } from '../timeline-store'

describe('TimelineStore', () => {
  let store: ReturnType<typeof createTimelineStore>

  beforeEach(() => {
    store = createTimelineStore()
  })

  describe('カレンダー開閉状態', () => {
    it('toggleCalendar: false → true に状態更新', () => {
      // Arrange
      const initialState = store.getState()
      expect(initialState.isCalendarOpen).toBe(false)

      // Act
      store.getState().toggleCalendar()

      // Assert
      const updatedState = store.getState()
      expect(updatedState.isCalendarOpen).toBe(true)
    })

    it('toggleCalendar: true → false に状態更新', () => {
      // Arrange
      store.getState().openCalendar()
      expect(store.getState().isCalendarOpen).toBe(true)

      // Act
      store.getState().toggleCalendar()

      // Assert
      expect(store.getState().isCalendarOpen).toBe(false)
    })

    it('openCalendar: カレンダーを開く', () => {
      // Arrange
      expect(store.getState().isCalendarOpen).toBe(false)

      // Act
      store.getState().openCalendar()

      // Assert
      expect(store.getState().isCalendarOpen).toBe(true)
    })

    it('closeCalendar: カレンダーを閉じる', () => {
      // Arrange
      store.getState().openCalendar()
      expect(store.getState().isCalendarOpen).toBe(true)

      // Act
      store.getState().closeCalendar()

      // Assert
      expect(store.getState().isCalendarOpen).toBe(false)
    })
  })

  describe('アクティブ日付管理', () => {
    it('setActiveDates: 日付セットを設定', () => {
      // Arrange
      const dates = new Set(['2026-01-17', '2026-01-16', '2026-01-15'])

      // Act
      store.getState().setActiveDates(dates)

      // Assert
      const state = store.getState()
      expect(state.activeDates).toEqual(dates)
      expect(state.activeDates.has('2026-01-17')).toBe(true)
    })

    it('addActiveDates: 既存の日付セットに追加', () => {
      // Arrange
      const initialDates = new Set(['2026-01-17'])
      store.getState().setActiveDates(initialDates)

      // Act
      store.getState().addActiveDates(['2026-01-16', '2026-01-15'])

      // Assert
      const state = store.getState()
      expect(state.activeDates.size).toBe(3)
      expect(state.activeDates.has('2026-01-17')).toBe(true)
      expect(state.activeDates.has('2026-01-16')).toBe(true)
      expect(state.activeDates.has('2026-01-15')).toBe(true)
    })

    it('addActiveDates: 重複する日付は1つだけカウント', () => {
      // Arrange
      const initialDates = new Set(['2026-01-17'])
      store.getState().setActiveDates(initialDates)

      // Act
      store.getState().addActiveDates(['2026-01-17', '2026-01-16'])

      // Assert
      const state = store.getState()
      expect(state.activeDates.size).toBe(2)
    })
  })

  describe('ほつれ日付管理', () => {
    it('setHotsureDates: ほつれ日付セットを設定', () => {
      // Arrange
      const hotsureDates = new Set(['2026-01-15', '2026-01-10'])

      // Act
      store.getState().setHotsureDates(hotsureDates)

      // Assert
      const state = store.getState()
      expect(state.hotsureDates).toEqual(hotsureDates)
      expect(state.hotsureDates.has('2026-01-15')).toBe(true)
    })

    it('ほつれ日付の確認: selectHasHotsureOnDate セレクター', () => {
      // Arrange
      const hotsureDates = new Set(['2026-01-15', '2026-01-10'])
      store.getState().setHotsureDates(hotsureDates)

      // Act
      const hasHotsureOn15 = selectHasHotsureOnDate(
        store.getState(),
        '2026-01-15'
      )
      const hasHotsureOn01 = selectHasHotsureOnDate(
        store.getState(),
        '2026-01-01'
      )

      // Assert
      expect(hasHotsureOn15).toBe(true)
      expect(hasHotsureOn01).toBe(false)
    })
  })

  describe('投稿日付管理（全期間）', () => {
    it('setEntryDates: 投稿日付セットを設定', () => {
      // Arrange
      const entryDates = new Set([
        '2026-01-17',
        '2026-01-16',
        '2026-01-15',
      ])

      // Act
      store.getState().setEntryDates(entryDates)

      // Assert
      const state = store.getState()
      expect(state.entryDates).toEqual(entryDates)
      expect(state.entryDates.size).toBe(3)
    })

    it('投稿日付の確認: selectHasEntryOnDate セレクター', () => {
      // Arrange
      const entryDates = new Set(['2026-01-17', '2026-01-16'])
      store.getState().setEntryDates(entryDates)

      // Act
      const hasEntryOn17 = selectHasEntryOnDate(store.getState(), '2026-01-17')
      const hasEntryOn15 = selectHasEntryOnDate(store.getState(), '2026-01-15')

      // Assert
      expect(hasEntryOn17).toBe(true)
      expect(hasEntryOn15).toBe(false)
    })
  })

  describe('同期制御', () => {
    it('setIsSnapping: スナップ状態を設定', () => {
      // Arrange
      expect(store.getState().isSnapping).toBe(false)

      // Act
      store.getState().setIsSnapping(true)

      // Assert
      expect(store.getState().isSnapping).toBe(true)
    })

    it('setSyncSource: 同期ソースを設定', () => {
      // Arrange
      expect(store.getState().syncSource).toBeNull()

      // Act
      store.getState().setSyncSource('carousel')

      // Assert
      expect(store.getState().syncSource).toBe('carousel')
    })

    it('setSyncSource: "timeline" を設定', () => {
      // Arrange
      store.getState().setSyncSource('carousel')

      // Act
      store.getState().setSyncSource('timeline')

      // Assert
      expect(store.getState().syncSource).toBe('timeline')
    })

    it('setSyncSource: null を設定してリセット', () => {
      // Arrange
      store.getState().setSyncSource('carousel')
      expect(store.getState().syncSource).toBe('carousel')

      // Act
      store.getState().setSyncSource(null)

      // Assert
      expect(store.getState().syncSource).toBeNull()
    })
  })

  describe('日付管理', () => {
    it('setCurrentDate: 現在の日付を設定', () => {
      // Arrange
      const newDate = new Date('2026-01-16')

      // Act
      store.getState().setCurrentDate(newDate)

      // Assert
      const state = store.getState()
      expect(state.currentDate).toEqual(newDate)
    })

    it('selectCurrentDateString: 日付文字列を取得（YYYY-MM-DD）', () => {
      // Arrange
      const date = new Date('2026-01-17T14:30:00+09:00')
      store.getState().setCurrentDate(date)

      // Act
      const dateString = selectCurrentDateString(store.getState())

      // Assert
      expect(dateString).toBe('2026-01-17')
    })
  })

  describe('カレンダー開閉状態セレクター', () => {
    it('selectIsCalendarOpen: 開いている状態を取得', () => {
      // Arrange
      store.getState().openCalendar()

      // Act
      const isOpen = selectIsCalendarOpen(store.getState())

      // Assert
      expect(isOpen).toBe(true)
    })

    it('selectIsCalendarOpen: 閉じている状態を取得', () => {
      // Arrange
      store.getState().closeCalendar()

      // Act
      const isOpen = selectIsCalendarOpen(store.getState())

      // Assert
      expect(isOpen).toBe(false)
    })
  })

  describe('リセット機能', () => {
    it('reset: 全ての状態を初期値に戻す', () => {
      // Arrange
      store.getState().openCalendar()
      store.getState().setActiveDates(new Set(['2026-01-17']))
      store.getState().setCurrentDate(new Date('2026-01-16'))
      store.getState().setSyncSource('carousel')
      store.getState().setIsSnapping(true)

      // Act
      store.getState().reset()

      // Assert
      const state = store.getState()
      expect(state.isCalendarOpen).toBe(false)
      expect(state.activeDates.size).toBe(0)
      expect(state.syncSource).toBeNull()
      expect(state.isSnapping).toBe(false)
    })

    it('reset: currentDate は新しいインスタンスになる', () => {
      // Arrange
      const originalDate = store.getState().currentDate
      store.getState().setCurrentDate(new Date('2026-01-16'))

      // Act
      store.getState().reset()

      // Assert
      const resetDate = store.getState().currentDate
      expect(resetDate).not.toBe(originalDate)
    })
  })

  describe('初期状態カスタマイズ', () => {
    it('createTimelineStore: カスタム初期状態で作成', () => {
      // Arrange
      const customInitialDate = new Date('2026-01-16')
      const customActiveDates = new Set(['2026-01-16', '2026-01-15'])

      // Act
      const customStore = createTimelineStore({
        currentDate: customInitialDate,
        activeDates: customActiveDates,
        isCalendarOpen: true,
      })

      // Assert
      const state = customStore.getState()
      expect(state.currentDate).toEqual(customInitialDate)
      expect(state.activeDates).toEqual(customActiveDates)
      expect(state.isCalendarOpen).toBe(true)
    })
  })

  describe('複数アクションの連続実行', () => {
    it('複数のアクションを順序通り実行', () => {
      // Arrange & Act
      store.getState().openCalendar()
      store.getState().setActiveDates(new Set(['2026-01-17']))
      store.getState().setSyncSource('timeline')
      store.getState().setIsSnapping(true)

      // Assert
      const state = store.getState()
      expect(state.isCalendarOpen).toBe(true)
      expect(state.activeDates.size).toBe(1)
      expect(state.syncSource).toBe('timeline')
      expect(state.isSnapping).toBe(true)
    })

    it('アクション実行後にリセット', () => {
      // Arrange
      store.getState().openCalendar()
      store.getState().setActiveDates(new Set(['2026-01-17']))

      // Act
      store.getState().reset()

      // Assert
      const state = store.getState()
      expect(state.isCalendarOpen).toBe(false)
      expect(state.activeDates.size).toBe(0)
    })
  })

  describe('ストアの購読機能', () => {
    it('subscribe: 状態変更時に購読者がコールバック受け取る', () => {
      // Arrange
      const callback = vi.fn()
      const unsubscribe = store.subscribe(
        (state) => state.isCalendarOpen,
        callback
      )

      // Act
      store.getState().openCalendar()

      // Assert
      expect(callback).toHaveBeenCalled()
      unsubscribe()
    })
  })
})

// 型安全性テスト（コンパイル時に確認）
describe('TimelineStore 型安全性', () => {
  it('各アクション関数の戻り値は void', () => {
    // Arrange
    const store = createTimelineStore()

    // Act - 戻り値が void であることを確認
    const result1: void = store.getState().toggleCalendar()
    const result2: void = store.getState().openCalendar()
    const result3: void = store.getState().closeCalendar()
    const result4: void = store.getState().setCurrentDate(new Date())
    const result5: void = store.getState().setActiveDates(new Set())
    const result6: void = store.getState().setIsSnapping(true)

    // Assert
    expect(result1).toBeUndefined()
    expect(result2).toBeUndefined()
    expect(result3).toBeUndefined()
    expect(result4).toBeUndefined()
    expect(result5).toBeUndefined()
    expect(result6).toBeUndefined()
  })
})
