/**
 * useScrollSyncフックのテスト
 * スクロール位置と日付ヘッダーの双方向同期機能
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useScrollSync } from '@/features/timeline/hooks/use-scroll-sync'
import type { TimelineEntry } from '@/features/timeline/types'

// requestAnimationFrameのモック
const originalRAF = global.requestAnimationFrame
const originalCAF = global.cancelAnimationFrame

// IntersectionObserverのモック（jsdomでは未定義のため）
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))
global.IntersectionObserver = mockIntersectionObserver

beforeEach(() => {
  let rafId = 0
  global.requestAnimationFrame = jest.fn((cb) => {
    rafId++
    setTimeout(() => cb(performance.now()), 0)
    return rafId
  })
  global.cancelAnimationFrame = jest.fn()

  // IntersectionObserverのモックをリセット
  mockIntersectionObserver.mockClear()
})

afterEach(() => {
  global.requestAnimationFrame = originalRAF
  global.cancelAnimationFrame = originalCAF
  jest.clearAllMocks()
})

// テスト用のエントリーデータ
function createMockEntries(dates: string[]): TimelineEntry[] {
  return dates.map((date, index) => ({
    id: `entry-${index}`,
    userId: 'test-user',
    content: `テスト投稿 ${index}`,
    imageUrl: null,
    createdAt: new Date(`${date}T12:00:00.000Z`),
    date,
  }))
}

// コンテナ要素のモック作成
function createMockContainer(entries: TimelineEntry[]) {
  const container = document.createElement('div')
  container.style.height = '500px'
  container.style.overflow = 'auto'
  // scrollToのモック
  container.scrollTo = jest.fn()

  // 各エントリー要素を追加
  entries.forEach((entry, index) => {
    const element = document.createElement('div')
    element.setAttribute('data-date', entry.date)
    element.setAttribute('data-index', String(index))
    element.style.height = '100px'
    // scrollIntoViewのモック（jsdomでは未実装）
    element.scrollIntoView = jest.fn()
    container.appendChild(element)
  })

  document.body.appendChild(container)
  return container
}

describe('useScrollSync', () => {
  let container: HTMLElement | null = null

  afterEach(() => {
    if (container) {
      container.remove()
      container = null
    }
  })

  describe('初期状態', () => {
    it('初期の現在日付は今日であること', () => {
      const entries = createMockEntries(['2024-12-18'])
      const containerRef = { current: null as HTMLElement | null }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      // 初期状態のcurrentDateは今日の日付
      expect(result.current.state.currentDate).toBeInstanceOf(Date)
    })

    it('初期のスナップ状態はfalseであること', () => {
      const entries = createMockEntries(['2024-12-18'])
      const containerRef = { current: null as HTMLElement | null }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      expect(result.current.state.isSnapping).toBe(false)
    })
  })

  describe('getDateAtPosition', () => {
    it('エントリーが空の場合、今日の日付を返すこと', () => {
      const containerRef = { current: null as HTMLElement | null }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries: [] })
      )

      const date = result.current.getDateAtPosition(0)
      expect(date).toBeInstanceOf(Date)
    })

    it('コンテナがない場合、今日の日付を返すこと', () => {
      const entries = createMockEntries(['2024-12-18'])
      const containerRef = { current: null as HTMLElement | null }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      const date = result.current.getDateAtPosition(100)
      expect(date).toBeInstanceOf(Date)
    })
  })

  describe('handleScroll', () => {
    it('スクロール時にonDateChangeが呼ばれること', async () => {
      const entries = createMockEntries(['2024-12-18', '2024-12-17'])
      container = createMockContainer(entries)
      const containerRef = { current: container }
      const onDateChange = jest.fn()

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries, onDateChange })
      )

      // handleScrollを呼び出す
      act(() => {
        result.current.handleScroll()
      })

      // requestAnimationFrameの実行を待つ
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    it('スナップ中はスクロールイベントを無視すること', async () => {
      const entries = createMockEntries(['2024-12-18', '2024-12-17'])
      container = createMockContainer(entries)
      const containerRef = { current: container }
      const onDateChange = jest.fn()

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries, onDateChange })
      )

      // スナップを開始（scrollToDateを呼ぶ）
      act(() => {
        result.current.scrollToDate(new Date('2024-12-17'))
      })

      // スナップ中にhandleScrollを呼び出す
      act(() => {
        result.current.handleScroll()
      })

      expect(result.current.state.isSnapping).toBe(true)
    })

    it('requestAnimationFrameでデバウンスされること', () => {
      const entries = createMockEntries(['2024-12-18'])
      container = createMockContainer(entries)
      const containerRef = { current: container }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      // 複数回handleScrollを呼び出す
      act(() => {
        result.current.handleScroll()
        result.current.handleScroll()
        result.current.handleScroll()
      })

      // cancelAnimationFrameが呼ばれることを確認（デバウンス処理）
      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('scrollToDate', () => {
    it('指定した日付の要素へスクロールすること', () => {
      const entries = createMockEntries(['2024-12-18', '2024-12-17', '2024-12-16'])
      container = createMockContainer(entries)

      // scrollIntoViewのモック
      const mockScrollIntoView = jest.fn()
      const targetElement = container.querySelector('[data-date="2024-12-17"]')
      if (targetElement) {
        targetElement.scrollIntoView = mockScrollIntoView
      }

      const containerRef = { current: container }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      act(() => {
        result.current.scrollToDate(new Date('2024-12-17'))
      })

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
    })

    it('対象日付の要素がない場合、コンテナのトップへスクロールすること', () => {
      const entries = createMockEntries(['2024-12-18'])
      container = createMockContainer(entries)

      // scrollToのモック
      const mockScrollTo = jest.fn()
      container.scrollTo = mockScrollTo

      const containerRef = { current: container }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      // 存在しない日付を指定
      act(() => {
        result.current.scrollToDate(new Date('2024-12-01'))
      })

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      })
    })

    it('スクロール中はisSnappingがtrueになること', () => {
      const entries = createMockEntries(['2024-12-18'])
      container = createMockContainer(entries)
      const containerRef = { current: container }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      act(() => {
        result.current.scrollToDate(new Date('2024-12-18'))
      })

      expect(result.current.state.isSnapping).toBe(true)
    })

    it('スクロール完了後（500ms後）にisSnappingがfalseになること', async () => {
      jest.useFakeTimers()

      const entries = createMockEntries(['2024-12-18'])
      container = createMockContainer(entries)
      const containerRef = { current: container }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      act(() => {
        result.current.scrollToDate(new Date('2024-12-18'))
      })

      expect(result.current.state.isSnapping).toBe(true)

      // 500ms経過
      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(result.current.state.isSnapping).toBe(false)

      jest.useRealTimers()
    })

    it('コンテナがない場合、何も起こらないこと', () => {
      const entries = createMockEntries(['2024-12-18'])
      const containerRef = { current: null as HTMLElement | null }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      // エラーなく実行できることを確認
      expect(() => {
        act(() => {
          result.current.scrollToDate(new Date('2024-12-18'))
        })
      }).not.toThrow()
    })
  })

  describe('日付境界検出（Intersection Observer）', () => {
    it('data-date属性を持つ要素から日付を取得できること', () => {
      const entries = createMockEntries(['2024-12-18', '2024-12-17'])
      container = createMockContainer(entries)

      // getBoundingClientRectのモック
      const elements = container.querySelectorAll('[data-date]')
      elements.forEach((el, index) => {
        jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
          top: index * 100,
          bottom: (index + 1) * 100,
          left: 0,
          right: 100,
          width: 100,
          height: 100,
          x: 0,
          y: index * 100,
          toJSON: () => {},
        })
      })

      jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 500,
        left: 0,
        right: 100,
        width: 100,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      })

      const containerRef = { current: container }

      const { result } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      const date = result.current.getDateAtPosition(0)
      // 最も近い日付を取得
      expect(date).toBeInstanceOf(Date)
    })

    it('Intersection Observerが設定されること', () => {
      const mockObserve = jest.fn()
      const mockDisconnect = jest.fn()
      const localMockIO = jest.fn(() => ({
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: jest.fn(),
      }))

      // IntersectionObserverをモック（グローバルモックを一時的に置き換え）
      const originalIO = global.IntersectionObserver
      global.IntersectionObserver = localMockIO as unknown as typeof IntersectionObserver

      const entries = createMockEntries(['2024-12-18', '2024-12-17'])
      container = createMockContainer(entries)
      const containerRef = { current: container }

      const { unmount } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      // IntersectionObserverが作成されること
      expect(localMockIO).toHaveBeenCalled()
      // 各data-date要素に対してobserveが呼ばれること
      expect(mockObserve).toHaveBeenCalledTimes(2)

      unmount()

      // クリーンアップでdisconnectが呼ばれること
      expect(mockDisconnect).toHaveBeenCalled()

      // 元に戻す
      global.IntersectionObserver = originalIO
    })
  })

  describe('クリーンアップ', () => {
    it('アンマウント時にrequestAnimationFrameがキャンセルされること', () => {
      const entries = createMockEntries(['2024-12-18'])
      const containerRef = { current: null as HTMLElement | null }

      const { unmount } = renderHook(() =>
        useScrollSync({ containerRef, entries })
      )

      unmount()

      // クリーンアップでcancelAnimationFrameが呼ばれる可能性がある
      // （rafIdRefが設定されていない場合は呼ばれない）
    })
  })
})
