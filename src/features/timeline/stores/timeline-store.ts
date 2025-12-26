'use client'

import { createStore } from 'zustand/vanilla'
import { createStoreContext } from '@/stores/create-store-context'

// ========================================
// 型定義
// ========================================

interface TimelineState {
  // 現在表示中の日付
  currentDate: Date
  // カレンダーの開閉状態
  isCalendarOpen: boolean
  // 読み込み済みの日付セット（YYYY-MM-DD形式）
  activeDates: Set<string>
  // ほつれを使用した日付セット（YYYY-MM-DD形式）
  hotsureDates: Set<string>
  // 投稿がある日付セット（全期間、YYYY-MM-DD形式）- カルーセル用
  entryDates: Set<string>
  // スクロール同期中フラグ（無限ループ防止用）
  isSnapping: boolean
  // 同期ソース（carousel/timeline）
  syncSource: 'carousel' | 'timeline' | null
}

interface TimelineActions {
  // 日付設定
  setCurrentDate: (date: Date) => void
  // カレンダー開閉
  toggleCalendar: () => void
  openCalendar: () => void
  closeCalendar: () => void
  // アクティブ日付管理
  setActiveDates: (dates: Set<string>) => void
  addActiveDates: (dates: string[]) => void
  // ほつれ日付管理
  setHotsureDates: (dates: Set<string>) => void
  // 投稿日付管理（全期間）
  setEntryDates: (dates: Set<string>) => void
  // 同期制御
  setIsSnapping: (value: boolean) => void
  setSyncSource: (source: 'carousel' | 'timeline' | null) => void
  // リセット
  reset: () => void
}

export type TimelineStore = TimelineState & TimelineActions

// ========================================
// デフォルト状態
// ========================================

const defaultInitState: TimelineState = {
  currentDate: new Date(),
  isCalendarOpen: false,
  activeDates: new Set(),
  hotsureDates: new Set(),
  entryDates: new Set(),
  isSnapping: false,
  syncSource: null,
}

// ========================================
// ストアファクトリ
// ========================================

export const createTimelineStore = (
  initState: Partial<TimelineState> = {}
) => {
  return createStore<TimelineStore>()((set) => ({
    // 初期状態
    ...defaultInitState,
    ...initState,

    // 日付設定
    setCurrentDate: (date) => set({ currentDate: date }),

    // カレンダー開閉
    toggleCalendar: () =>
      set((state) => ({ isCalendarOpen: !state.isCalendarOpen })),
    openCalendar: () => set({ isCalendarOpen: true }),
    closeCalendar: () => set({ isCalendarOpen: false }),

    // アクティブ日付管理
    setActiveDates: (dates) => set({ activeDates: dates }),
    addActiveDates: (dates) =>
      set((state) => {
        const newSet = new Set(state.activeDates)
        dates.forEach((d) => newSet.add(d))
        return { activeDates: newSet }
      }),

    // ほつれ日付管理
    setHotsureDates: (dates) => set({ hotsureDates: dates }),

    // 投稿日付管理（全期間）
    setEntryDates: (dates) => set({ entryDates: dates }),

    // 同期制御
    setIsSnapping: (value) => set({ isSnapping: value }),
    setSyncSource: (source) => set({ syncSource: source }),

    // リセット
    reset: () => set(defaultInitState),
  }))
}

// ========================================
// Provider/Hook生成
// ========================================

const {
  StoreContext: TimelineStoreContext,
  StoreProvider: TimelineStoreProvider,
  useStoreHook: useTimelineStore,
  useStoreApi: useTimelineStoreApi,
} = createStoreContext(createTimelineStore, 'TimelineStore')

export {
  TimelineStoreContext,
  TimelineStoreProvider,
  useTimelineStore,
  useTimelineStoreApi,
}
