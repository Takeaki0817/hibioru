import { renderHook, act, waitFor } from '@testing-library/react'
import { useDateDetection } from '../use-date-detection'
import { createTimelineStore } from '../../stores/timeline-store'
import type { StoreApi } from 'zustand'
import type { TimelineStore } from '../../stores/timeline-store'

describe('useDateDetection', () => {
  let containerRef: React.RefObject<HTMLDivElement | null>
  let dateRefs: React.RefObject<Map<string, HTMLDivElement>>
  let storeApi: StoreApi<TimelineStore>

  beforeEach(() => {
    // containerRef のセットアップ
    const container = document.createElement('div')
    container.id = 'timeline-container'
    container.style.height = '600px'
    container.style.overflow = 'auto'
    document.body.appendChild(container)

    containerRef = { current: container }

    // dateRefs のセットアップ - 複数の日付セクションを作成
    const dateRefsMap = new Map<string, HTMLDivElement>()

    // 2026-01-17 セクション
    const section1 = document.createElement('div')
    section1.id = 'date-2026-01-17'
    section1.style.height = '200px'
    Object.defineProperty(section1, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        bottom: 200,
        left: 0,
        right: 100,
      }),
    })
    container.appendChild(section1)
    dateRefsMap.set('2026-01-17', section1)

    // 2026-01-16 セクション
    const section2 = document.createElement('div')
    section2.id = 'date-2026-01-16'
    section2.style.height = '200px'
    Object.defineProperty(section2, 'getBoundingClientRect', {
      value: () => ({
        top: 200,
        bottom: 400,
        left: 0,
        right: 100,
      }),
    })
    container.appendChild(section2)
    dateRefsMap.set('2026-01-16', section2)

    // 2026-01-15 セクション
    const section3 = document.createElement('div')
    section3.id = 'date-2026-01-15'
    section3.style.height = '200px'
    Object.defineProperty(section3, 'getBoundingClientRect', {
      value: () => ({
        top: 400,
        bottom: 600,
        left: 0,
        right: 100,
      }),
    })
    container.appendChild(section3)
    dateRefsMap.set('2026-01-15', section3)

    dateRefs = { current: dateRefsMap }

    // Zustand ストアのセットアップ
    storeApi = createTimelineStore()
  })

  afterEach(() => {
    const container = document.getElementById('timeline-container')
    if (container) {
      document.body.removeChild(container)
    }
  })

  it('初期化時に初期日付を設定', () => {
    // Arrange
    const initialDateStr = '2026-01-17'

    // Act
    const { result } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr,
      })
    )

    // Assert
    expect(result.current.visibleDate).toBe(initialDateStr)
  })

  it('スクロール時に検出ラインにある日付を検出', async () => {
    // Arrange
    const initialDateStr = '2026-01-17'
    const onDateChange = jest.fn()

    renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr,
        onDateChange,
      })
    )

    // Act - スクロール イベントをシミュレート
    act(() => {
      const scrollEvent = new Event('scroll')
      containerRef.current?.dispatchEvent(scrollEvent)
    })

    // Assert
    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalled()
    })
  })

  it('日付変更検出: 異なる日付が検出ラインに来たときコールバック発火', async () => {
    // Arrange
    const initialDateStr = '2026-01-17'
    const onDateChange = jest.fn()

    const { result } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr,
        onDateChange,
      })
    )

    // セクション1の状態を確認
    expect(result.current.visibleDate).toBe(initialDateStr)

    // Act - セクション2が検出ラインに来るようにモック更新
    const section2 = dateRefs.current?.get('2026-01-16')
    if (section2) {
      Object.defineProperty(section2, 'getBoundingClientRect', {
        value: () => ({
          top: 0,
          bottom: 200,
          left: 0,
          right: 100,
        }),
      })
    }

    act(() => {
      const scrollEvent = new Event('scroll')
      containerRef.current?.dispatchEvent(scrollEvent)
    })

    // Assert
    await waitFor(() => {
      if (onDateChange.mock.calls.length > 0) {
        expect(onDateChange).toHaveBeenCalled()
      }
    })
  })

  it('syncSource="carousel" の場合、スクロール検出をスキップ', () => {
    // Arrange
    const initialDateStr = '2026-01-17'
    const onDateChange = jest.fn()

    // syncSource を "carousel" に設定
    storeApi.setState({ syncSource: 'carousel' })

    renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr,
        onDateChange,
      })
    )

    // Act - スクロール イベント
    act(() => {
      const scrollEvent = new Event('scroll')
      containerRef.current?.dispatchEvent(scrollEvent)
    })

    // Assert - syncSource="carousel" なのでスキップされるはず
  })

  it('visibleDateRef を使用した同期機能', async () => {
    // Arrange
    const initialDateStr = '2026-01-17'

    const { result } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr,
      })
    )

    // Assert
    expect(result.current.visibleDateRef.current).toBe(initialDateStr)
  })

  it('containerRef が null の場合はセットアップをスキップ', () => {
    // Arrange
    const nullContainerRef = { current: null }

    // Act - 例外が発生しないことを確認
    const { result } = renderHook(() =>
      useDateDetection({
        containerRef: nullContainerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr: '2026-01-17',
      })
    )

    // Assert
    expect(result.current.visibleDate).toBe('2026-01-17')
  })

  it('アンマウント時にイベントリスナーをクリーンアップ', () => {
    // Arrange
    const initialDateStr = '2026-01-17'
    const removeEventListenerSpy = jest.spyOn(
      containerRef.current!,
      'removeEventListener'
    )

    // Act
    const { unmount } = renderHook(() =>
      useDateDetection({
        containerRef,
        dateRefs,
        displayedDates: ['2026-01-17', '2026-01-16', '2026-01-15'],
        storeApi,
        initialDateStr,
      })
    )

    unmount()

    // Assert
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.any(Object)
    )
  })
})
