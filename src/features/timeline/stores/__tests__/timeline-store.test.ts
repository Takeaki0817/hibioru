/**
 * TimelineStore ユニットテスト
 * @jest-environment node
 */

import { createTimelineStore, type TimelineStore } from '../timeline-store'
import type { StoreApi } from 'zustand/vanilla'

describe('timeline-store', () => {
  let store: StoreApi<TimelineStore>

  beforeEach(() => {
    // 各テスト前にストアを新規作成
    store = createTimelineStore()
  })

  describe('初期状態', () => {
    it('初期値が正しく設定されていること', () => {
      const state = store.getState()

      expect(state.currentDate).toBeInstanceOf(Date)
      expect(state.isCalendarOpen).toBe(false)
      expect(state.activeDates).toBeInstanceOf(Set)
      expect(state.activeDates.size).toBe(0)
      expect(state.isSnapping).toBe(false)
      expect(state.syncSource).toBeNull()
    })

    it('カスタム初期状態で生成できること', () => {
      const customDate = new Date('2024-01-15')
      const customStore = createTimelineStore({
        currentDate: customDate,
        isCalendarOpen: true,
      })
      const state = customStore.getState()

      expect(state.currentDate).toEqual(customDate)
      expect(state.isCalendarOpen).toBe(true)
    })
  })

  describe('setCurrentDate', () => {
    it('日付を設定できること', () => {
      const newDate = new Date('2024-06-15')
      store.getState().setCurrentDate(newDate)

      expect(store.getState().currentDate).toEqual(newDate)
    })
  })

  describe('カレンダー開閉', () => {
    it('toggleCalendarでカレンダーを開閉できること', () => {
      expect(store.getState().isCalendarOpen).toBe(false)

      store.getState().toggleCalendar()
      expect(store.getState().isCalendarOpen).toBe(true)

      store.getState().toggleCalendar()
      expect(store.getState().isCalendarOpen).toBe(false)
    })

    it('openCalendarでカレンダーを開けること', () => {
      store.getState().openCalendar()
      expect(store.getState().isCalendarOpen).toBe(true)
    })

    it('closeCalendarでカレンダーを閉じれること', () => {
      store.getState().openCalendar()
      store.getState().closeCalendar()
      expect(store.getState().isCalendarOpen).toBe(false)
    })
  })

  describe('アクティブ日付管理', () => {
    it('setActiveDatesで日付セットを設定できること', () => {
      const dates = new Set(['2024-01-01', '2024-01-02', '2024-01-03'])
      store.getState().setActiveDates(dates)

      expect(store.getState().activeDates).toEqual(dates)
    })

    it('addActiveDatesで日付を追加できること', () => {
      store.getState().setActiveDates(new Set(['2024-01-01']))
      store.getState().addActiveDates(['2024-01-02', '2024-01-03'])

      const activeDates = store.getState().activeDates
      expect(activeDates.has('2024-01-01')).toBe(true)
      expect(activeDates.has('2024-01-02')).toBe(true)
      expect(activeDates.has('2024-01-03')).toBe(true)
      expect(activeDates.size).toBe(3)
    })

    it('addActiveDatesで重複する日付は追加されないこと', () => {
      store.getState().setActiveDates(new Set(['2024-01-01']))
      store.getState().addActiveDates(['2024-01-01', '2024-01-02'])

      expect(store.getState().activeDates.size).toBe(2)
    })
  })

  describe('同期制御', () => {
    it('setIsSnappingでスナッピング状態を設定できること', () => {
      store.getState().setIsSnapping(true)
      expect(store.getState().isSnapping).toBe(true)

      store.getState().setIsSnapping(false)
      expect(store.getState().isSnapping).toBe(false)
    })

    it('setSyncSourceで同期ソースを設定できること', () => {
      store.getState().setSyncSource('carousel')
      expect(store.getState().syncSource).toBe('carousel')

      store.getState().setSyncSource('timeline')
      expect(store.getState().syncSource).toBe('timeline')

      store.getState().setSyncSource(null)
      expect(store.getState().syncSource).toBeNull()
    })
  })

  describe('reset', () => {
    it('全ての状態を初期値にリセットできること', () => {
      // 状態を変更
      store.getState().setCurrentDate(new Date('2024-06-15'))
      store.getState().openCalendar()
      store.getState().setActiveDates(new Set(['2024-01-01']))
      store.getState().setIsSnapping(true)
      store.getState().setSyncSource('carousel')

      // リセット
      store.getState().reset()
      const state = store.getState()

      // 日付は現在日付（Date型であることを確認）
      expect(state.currentDate).toBeInstanceOf(Date)
      expect(state.isCalendarOpen).toBe(false)
      expect(state.activeDates.size).toBe(0)
      expect(state.isSnapping).toBe(false)
      expect(state.syncSource).toBeNull()
    })
  })

  describe('ストア独立性', () => {
    it('複数のストアインスタンスが独立していること', () => {
      const store1 = createTimelineStore()
      const store2 = createTimelineStore()

      store1.getState().openCalendar()
      store1.getState().setActiveDates(new Set(['2024-01-01']))

      // store2は影響を受けない
      expect(store2.getState().isCalendarOpen).toBe(false)
      expect(store2.getState().activeDates.size).toBe(0)
    })
  })
})
