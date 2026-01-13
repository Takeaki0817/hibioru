/**
 * useInitialScroll フックのユニットテスト
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useInitialScroll } from '../use-initial-scroll'

// requestAnimationFrame モック
let rafCallbacks: FrameRequestCallback[] = []
const mockRequestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  rafCallbacks.push(callback)
  return rafCallbacks.length
})

// scrollIntoView モック
const mockScrollIntoView = jest.fn()

beforeAll(() => {
  window.requestAnimationFrame = mockRequestAnimationFrame
})

describe('useInitialScroll', () => {
  let mockContainer: HTMLDivElement
  let mockDateRefs: Map<string, HTMLDivElement>
  let mockFetchNextPage: jest.Mock
  let mockFetchPreviousPage: jest.Mock
  let mockSetDisplayedDateCount: jest.Mock
  let mockIsLoadingMoreRef: React.RefObject<boolean>

  beforeEach(() => {
    jest.clearAllMocks()
    rafCallbacks = []

    // コンテナ要素のモック
    mockContainer = document.createElement('div')

    // 日付要素のMapを初期化
    mockDateRefs = new Map()

    // フェッチ関数のモック
    mockFetchNextPage = jest.fn().mockResolvedValue(undefined)
    mockFetchPreviousPage = jest.fn().mockResolvedValue(undefined)
    mockSetDisplayedDateCount = jest.fn()

    // ローディングフラグのモック
    mockIsLoadingMoreRef = { current: false }
  })

  afterEach(() => {
    mockContainer.remove()
  })

  // ヘルパー: 日付要素を作成してMapに追加
  const createDateElement = (dateKey: string): HTMLDivElement => {
    const element = document.createElement('div')
    element.scrollIntoView = mockScrollIntoView
    mockDateRefs.set(dateKey, element)
    return element
  }

  // ヘルパー: 全てのrafコールバックを実行
  const flushRaf = () => {
    const callbacks = [...rafCallbacks]
    rafCallbacks = []
    callbacks.forEach((cb) => cb(0))
  }

  describe('scrollToDate', () => {
    it('日付要素が存在する場合にスムーズスクロールすること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      createDateElement('2024-01-15')

      const { result } = renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      act(() => {
        result.current.scrollToDate(new Date('2024-01-15'))
      })

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
    })

    it('日付要素が存在しない場合はスクロールしないこと', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      const { result } = renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: [],
          allDates: [],
          dateIndexMap: new Map(),
          displayedDateCount: 0,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      act(() => {
        result.current.scrollToDate(new Date('2024-01-15'))
      })

      expect(mockScrollIntoView).not.toHaveBeenCalled()
    })
  })

  describe('初期スクロール', () => {
    it('initialDateが指定されている場合にその日付にスクロールすること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      createDateElement('2024-01-15')

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: new Date('2024-01-15'),
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      // requestAnimationFrameコールバックを実行
      act(() => {
        flushRaf()
      })

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'start',
      })
    })

    it('initialDateが指定されていない場合に最新日付にスクロールすること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      createDateElement('2024-01-14')
      createDateElement('2024-01-15')

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-14', '2024-01-15'],
          allDates: ['2024-01-14', '2024-01-15'],
          dateIndexMap: new Map([
            ['2024-01-14', 0],
            ['2024-01-15', 1],
          ]),
          displayedDateCount: 2,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      // requestAnimationFrameコールバックを実行
      act(() => {
        flushRaf()
      })

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'end',
      })
    })

    it('containerRefがnullの場合はスクロールしないこと', () => {
      const containerRef = { current: null }
      const dateRefsRef = { current: mockDateRefs }

      createDateElement('2024-01-15')

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: new Date('2024-01-15'),
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      act(() => {
        flushRaf()
      })

      expect(mockScrollIntoView).not.toHaveBeenCalled()
    })

    it('displayedDatesが空の場合はスクロールしないこと', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: [],
          allDates: [],
          dateIndexMap: new Map(),
          displayedDateCount: 0,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      act(() => {
        flushRaf()
      })

      expect(mockScrollIntoView).not.toHaveBeenCalled()
    })

    it('初期スクロールは一度だけ実行されること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      createDateElement('2024-01-15')

      const { result, rerender } = renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      act(() => {
        flushRaf()
      })

      expect(mockScrollIntoView).toHaveBeenCalledTimes(1)
      expect(result.current.initialScrollDoneRef.current).toBe(true)

      // 再レンダリング
      rerender()
      act(() => {
        flushRaf()
      })

      // 追加のスクロールは発生しない
      expect(mockScrollIntoView).toHaveBeenCalledTimes(1)
    })
  })

  describe('scrollToDateRef / loadAndScrollToDateRef', () => {
    it('scrollToDateRefに関数が設定されること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }
      const scrollToDateRef = { current: null as ((date: Date) => void) | null }

      createDateElement('2024-01-15')

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
          scrollToDateRef,
        })
      )

      expect(scrollToDateRef.current).not.toBeNull()
      expect(typeof scrollToDateRef.current).toBe('function')
    })

    it('loadAndScrollToDateRefに関数が設定されること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }
      const loadAndScrollToDateRef = {
        current: null as ((date: Date) => Promise<void>) | null,
      }

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
          loadAndScrollToDateRef,
        })
      )

      expect(loadAndScrollToDateRef.current).not.toBeNull()
      expect(typeof loadAndScrollToDateRef.current).toBe('function')
    })

    it('アンマウント時にrefがnullにリセットされること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }
      const scrollToDateRef = { current: null as ((date: Date) => void) | null }
      const loadAndScrollToDateRef = {
        current: null as ((date: Date) => Promise<void>) | null,
      }

      const { unmount } = renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: [],
          allDates: [],
          dateIndexMap: new Map(),
          displayedDateCount: 0,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
          scrollToDateRef,
          loadAndScrollToDateRef,
        })
      )

      expect(scrollToDateRef.current).not.toBeNull()
      expect(loadAndScrollToDateRef.current).not.toBeNull()

      unmount()

      expect(scrollToDateRef.current).toBeNull()
      expect(loadAndScrollToDateRef.current).toBeNull()
    })
  })

  describe('loadAndScrollToDate', () => {
    it('既にDOMに存在する日付へ即座にスクロールすること', async () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }
      const loadAndScrollToDateRef = {
        current: null as ((date: Date) => Promise<void>) | null,
      }

      createDateElement('2024-01-15')

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
          loadAndScrollToDateRef,
        })
      )

      await act(async () => {
        await loadAndScrollToDateRef.current!(new Date('2024-01-15'))
      })

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
      expect(mockFetchNextPage).not.toHaveBeenCalled()
    })

    it('表示範囲外の日付の場合にdisplayedDateCountを拡大すること', async () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }
      const loadAndScrollToDateRef = {
        current: null as ((date: Date) => Promise<void>) | null,
      }

      // 日付を作成（ただし初期表示には含まれない）
      createDateElement('2024-01-10')

      renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'], // 2024-01-10は含まれない
          allDates: ['2024-01-10', '2024-01-11', '2024-01-12', '2024-01-15'],
          dateIndexMap: new Map([
            ['2024-01-10', 0],
            ['2024-01-11', 1],
            ['2024-01-12', 2],
            ['2024-01-15', 3],
          ]),
          displayedDateCount: 1,
          initialDate: undefined,
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
          loadAndScrollToDateRef,
        })
      )

      await act(async () => {
        await loadAndScrollToDateRef.current!(new Date('2024-01-10'))
      })

      // displayedDateCountが拡大される
      expect(mockSetDisplayedDateCount).toHaveBeenCalled()
    })
  })

  describe('initialScrollDoneRef', () => {
    it('初期スクロール完了後にtrueになること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      createDateElement('2024-01-15')

      const { result } = renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: new Date('2024-01-15'),
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      expect(result.current.initialScrollDoneRef.current).toBe(false)

      act(() => {
        flushRaf()
      })

      expect(result.current.initialScrollDoneRef.current).toBe(true)
    })

    it('initialDateの要素が存在しない場合はfalseのままになること', () => {
      const containerRef = { current: mockContainer }
      const dateRefsRef = { current: mockDateRefs }

      // 要素を作成しない

      const { result } = renderHook(() =>
        useInitialScroll({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          allDates: ['2024-01-15'],
          dateIndexMap: new Map([['2024-01-15', 0]]),
          displayedDateCount: 1,
          initialDate: new Date('2024-01-15'),
          hasNextPage: false,
          hasPreviousPage: false,
          fetchNextPage: mockFetchNextPage,
          fetchPreviousPage: mockFetchPreviousPage,
          setDisplayedDateCount: mockSetDisplayedDateCount,
          isLoadingMoreRef: mockIsLoadingMoreRef,
        })
      )

      act(() => {
        flushRaf()
      })

      // 要素が存在しないのでfalseのまま
      expect(result.current.initialScrollDoneRef.current).toBe(false)
    })
  })
})
