/**
 * useDateDetection フックのユニットテスト
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useDateDetection } from '../use-date-detection'
import type { StoreApi } from 'zustand'
import type { TimelineStore } from '../../stores/timeline-store'

// requestAnimationFrame モック
let rafCallback: FrameRequestCallback | null = null
const mockRequestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  rafCallback = callback
  return 1
})
const mockCancelAnimationFrame = jest.fn()

// IntersectionObserver モック（このフックでは直接使わないが、環境設定として）
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})

beforeAll(() => {
  window.requestAnimationFrame = mockRequestAnimationFrame
  window.cancelAnimationFrame = mockCancelAnimationFrame
  window.IntersectionObserver =
    mockIntersectionObserver as unknown as typeof IntersectionObserver
})

describe('useDateDetection', () => {
  let mockContainer: HTMLDivElement
  let mockDateRefs: Map<string, HTMLDivElement>
  let mockStoreApi: StoreApi<TimelineStore>
  let mockOnDateChange: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    rafCallback = null

    // コンテナ要素のモック
    mockContainer = document.createElement('div')
    mockContainer.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 0,
      bottom: 500,
      left: 0,
      right: 300,
      width: 300,
      height: 500,
    })

    // 日付要素のMapを初期化
    mockDateRefs = new Map()

    // ストアAPIのモック
    mockStoreApi = {
      getState: jest.fn().mockReturnValue({ syncSource: null }),
      setState: jest.fn(),
      subscribe: jest.fn(),
      getInitialState: jest.fn(),
    } as unknown as StoreApi<TimelineStore>

    // コールバックのモック
    mockOnDateChange = jest.fn()
  })

  afterEach(() => {
    mockContainer.remove()
  })

  it('初期状態でinitialDateStrが設定されること', () => {
    const containerRef = { current: mockContainer }
    const dateRefsRef = { current: mockDateRefs }

    const { result } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-15',
        onDateChange: mockOnDateChange,
      })
    )

    expect(result.current.visibleDate).toBe('2024-01-15')
    expect(result.current.visibleDateRef.current).toBe('2024-01-15')
  })

  it('containerRefがnullの場合はスクロールイベントが登録されないこと', () => {
    const containerRef = { current: null }
    const dateRefsRef = { current: mockDateRefs }

    const addEventListenerSpy = jest.spyOn(mockContainer, 'addEventListener')

    renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-15',
        onDateChange: mockOnDateChange,
      })
    )

    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('スクロールイベントが登録されること', () => {
    const containerRef = { current: mockContainer }
    const dateRefsRef = { current: mockDateRefs }

    const addEventListenerSpy = jest.spyOn(mockContainer, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(
      mockContainer,
      'removeEventListener'
    )

    const { unmount } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-15',
        onDateChange: mockOnDateChange,
      })
    )

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    )
  })

  it('検知ライン内に日付要素がある場合にvisibleDateが更新されること', () => {
    const containerRef = { current: mockContainer }

    // 日付要素を作成（検知ライン = top:0 + offset:12 = 12）
    const dateElement1 = document.createElement('div')
    dateElement1.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 0, // 検知ライン(12)より上
      bottom: 100, // 検知ライン(12)より下 → この範囲に検知ラインがある
    })

    const dateElement2 = document.createElement('div')
    dateElement2.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 100,
      bottom: 200,
    })

    mockDateRefs.set('2024-01-15', dateElement1)
    mockDateRefs.set('2024-01-14', dateElement2)

    const dateRefsRef = { current: mockDateRefs }

    const { result } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15', '2024-01-14'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-14',
        onDateChange: mockOnDateChange,
      })
    )

    // 初期読み込み時のrequestAnimationFrameコールバックを実行
    act(() => {
      if (rafCallback) {
        rafCallback(0)
      }
    })

    // 2024-01-15が検知ラインに含まれるので更新される
    expect(result.current.visibleDate).toBe('2024-01-15')
    expect(mockOnDateChange).toHaveBeenCalledWith(new Date('2024-01-15'))
  })

  it('syncSourceがcarouselの場合は日付検出をスキップすること', () => {
    const containerRef = { current: mockContainer }

    // ストアがcarouselモードを返すようにモック
    mockStoreApi = {
      getState: jest.fn().mockReturnValue({ syncSource: 'carousel' }),
      setState: jest.fn(),
      subscribe: jest.fn(),
      getInitialState: jest.fn(),
    } as unknown as StoreApi<TimelineStore>

    const dateElement = document.createElement('div')
    dateElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 0,
      bottom: 100,
    })
    mockDateRefs.set('2024-01-15', dateElement)

    const dateRefsRef = { current: mockDateRefs }

    const { result } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-14',
        onDateChange: mockOnDateChange,
      })
    )

    // 初期読み込み時のrequestAnimationFrameコールバックを実行
    act(() => {
      if (rafCallback) {
        rafCallback(0)
      }
    })

    // syncSourceがcarouselなので更新されない
    expect(result.current.visibleDate).toBe('2024-01-14')
    expect(mockOnDateChange).not.toHaveBeenCalled()
  })

  it('同じ日付の場合はonDateChangeが呼ばれないこと', () => {
    const containerRef = { current: mockContainer }

    const dateElement = document.createElement('div')
    dateElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 0,
      bottom: 100,
    })
    mockDateRefs.set('2024-01-15', dateElement)

    const dateRefsRef = { current: mockDateRefs }

    renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-15', // 既に同じ日付
        onDateChange: mockOnDateChange,
      })
    )

    // 初期読み込み時のrequestAnimationFrameコールバックを実行
    act(() => {
      if (rafCallback) {
        rafCallback(0)
      }
    })

    // 同じ日付なので呼ばれない
    expect(mockOnDateChange).not.toHaveBeenCalled()
  })

  it('スクロール時にrequestAnimationFrameでスロットルされること', () => {
    const containerRef = { current: mockContainer }
    const dateRefsRef = { current: mockDateRefs }

    renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-15',
        onDateChange: mockOnDateChange,
      })
    )

    // スクロールイベントをシミュレート
    const scrollEvent = new Event('scroll')

    // 初期のrafをクリア
    mockRequestAnimationFrame.mockClear()

    act(() => {
      mockContainer.dispatchEvent(scrollEvent)
    })

    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1)

    // rafが完了前に再度スクロール
    act(() => {
      mockContainer.dispatchEvent(scrollEvent)
    })

    // スロットルにより追加のrequestAnimationFrameは呼ばれない
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it('アンマウント時にcancelAnimationFrameが呼ばれること', () => {
    const containerRef = { current: mockContainer }
    const dateRefsRef = { current: mockDateRefs }

    const { unmount } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs: dateRefsRef,
        displayedDates: ['2024-01-15'],
        storeApi: mockStoreApi,
        initialDateStr: '2024-01-15',
        onDateChange: mockOnDateChange,
      })
    )

    // スクロールをトリガーしてrafIdを設定
    const scrollEvent = new Event('scroll')
    act(() => {
      mockContainer.dispatchEvent(scrollEvent)
    })

    unmount()

    expect(mockCancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('onDateChangeがundefinedでもエラーにならないこと', () => {
    const containerRef = { current: mockContainer }

    const dateElement = document.createElement('div')
    dateElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 0,
      bottom: 100,
    })
    mockDateRefs.set('2024-01-15', dateElement)

    const dateRefsRef = { current: mockDateRefs }

    expect(() => {
      const { result } = renderHook(() =>
        useDateDetection({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates: ['2024-01-15'],
          storeApi: mockStoreApi,
          initialDateStr: '2024-01-14',
          onDateChange: undefined,
        })
      )

      act(() => {
        if (rafCallback) {
          rafCallback(0)
        }
      })

      expect(result.current.visibleDate).toBe('2024-01-15')
    }).not.toThrow()
  })

  it('displayedDatesが変更されたときにエフェクトが再実行されること', () => {
    const containerRef = { current: mockContainer }
    const dateRefsRef = { current: mockDateRefs }

    const { rerender } = renderHook(
      ({ displayedDates }) =>
        useDateDetection({
          containerRef,
          dateRefs: dateRefsRef,
          displayedDates,
          storeApi: mockStoreApi,
          initialDateStr: '2024-01-15',
          onDateChange: mockOnDateChange,
        }),
      {
        initialProps: { displayedDates: ['2024-01-15'] },
      }
    )

    const initialCallCount = mockRequestAnimationFrame.mock.calls.length

    // displayedDatesを変更
    rerender({ displayedDates: ['2024-01-15', '2024-01-14'] })

    // 再実行により追加のrequestAnimationFrameが呼ばれる
    expect(mockRequestAnimationFrame.mock.calls.length).toBeGreaterThan(
      initialCallCount
    )
  })
})
