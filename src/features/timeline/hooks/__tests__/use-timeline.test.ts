import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTimeline } from '../use-timeline'
import { fetchEntries } from '../../api/queries'
import type { TimelinePage, TimelineEntry } from '../../types'
import React from 'react'

// モック
jest.mock('../../api/queries')

// テストデータ
const TEST_USER_ID = 'test-user-001'

const MOCK_TIMELINE_ENTRY: TimelineEntry = {
  id: '1',
  userId: TEST_USER_ID,
  content: '今日も頑張った',
  imageUrls: null,
  createdAt: new Date('2026-01-17T14:30:00+09:00'),
  date: '2026-01-17',
}

const MOCK_TIMELINE_ENTRY_2: TimelineEntry = {
  id: '2',
  userId: TEST_USER_ID,
  content: '朝から活動的だった',
  imageUrls: null,
  createdAt: new Date('2026-01-17T09:00:00+09:00'),
  date: '2026-01-17',
}

const MOCK_TIMELINE_PAGE: TimelinePage = {
  entries: [MOCK_TIMELINE_ENTRY, MOCK_TIMELINE_ENTRY_2],
  nextCursor: '2026-01-17T09:00:00+09:00',
  prevCursor: '2026-01-17T14:30:00+09:00',
}

const MOCK_EMPTY_PAGE: TimelinePage = {
  entries: [],
  nextCursor: null,
  prevCursor: null,
}

// QueryClient ラッパー
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('初期化と初回フェッチ: オプション未指定時に今日のデータを取得', async () => {
    // Arrange
    ;(fetchEntries as jest.Mock).mockResolvedValue(MOCK_TIMELINE_PAGE)

    // Act
    const { result } = renderHook(
      () => useTimeline({ userId: TEST_USER_ID }),
      { wrapper: createWrapper() }
    )

    // Assert
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2)
    })
    expect(result.current.entries[0].id).toBe('1')
    expect(result.current.hasNextPage).toBe(true)
  })

  it('ページネーション遅延: fetchNextPage呼び出し時に追加データ取得', async () => {
    // Arrange
    const mockNextPage: TimelinePage = {
      entries: [
        {
          id: '3',
          userId: TEST_USER_ID,
          content: '前日の記録',
          imageUrls: null,
          createdAt: new Date('2026-01-16T20:00:00+09:00'),
          date: '2026-01-16',
        },
      ],
      nextCursor: null,
      prevCursor: '2026-01-17T09:00:00+09:00',
    }

    ;(fetchEntries as jest.Mock)
      .mockResolvedValueOnce(MOCK_TIMELINE_PAGE)
      .mockResolvedValueOnce(mockNextPage)

    // Act
    const { result } = renderHook(
      () => useTimeline({ userId: TEST_USER_ID }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2)
    })

    // fetchNextPage呼び出し
    await result.current.fetchNextPage()

    // Assert
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(3)
    })
  })

  it('ページネーション遅延: fetchPreviousPage呼び出し時に追加データ取得', async () => {
    // Arrange
    const mockPrevPage: TimelinePage = {
      entries: [
        {
          id: '0',
          userId: TEST_USER_ID,
          content: '翌日の記録',
          imageUrls: null,
          createdAt: new Date('2026-01-18T10:00:00+09:00'),
          date: '2026-01-18',
        },
      ],
      nextCursor: '2026-01-17T14:30:00+09:00',
      prevCursor: '2026-01-18T10:00:00+09:00',
    }

    ;(fetchEntries as jest.Mock)
      .mockResolvedValueOnce(MOCK_TIMELINE_PAGE)
      .mockResolvedValueOnce(mockPrevPage)

    // Act
    const { result } = renderHook(
      () => useTimeline({ userId: TEST_USER_ID }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2)
    })

    // fetchPreviousPage呼び出し
    await result.current.fetchPreviousPage()

    // Assert
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(3)
    })
  })

  it('エラー状態: isError=trueときrefetch()で再試行可能', async () => {
    // Arrange
    const mockError = new Error('Fetch failed')
    ;(fetchEntries as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(MOCK_TIMELINE_PAGE)

    // Act
    const { result } = renderHook(
      () => useTimeline({ userId: TEST_USER_ID }),
      { wrapper: createWrapper() }
    )

    // エラー状態を待つ
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()

    // refetchを呼び出し
    await result.current.refetch()

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(false)
      expect(result.current.entries).toHaveLength(2)
    })
  })

  it('空レスポンス処理: entries=[]、hasNextPage=falseの正しい反映', async () => {
    // Arrange
    ;(fetchEntries as jest.Mock).mockResolvedValue(MOCK_EMPTY_PAGE)

    // Act
    const { result } = renderHook(
      () => useTimeline({ userId: TEST_USER_ID }),
      { wrapper: createWrapper() }
    )

    // Assert
    await waitFor(() => {
      expect(result.current.entries).toHaveLength(0)
    })
    expect(result.current.hasNextPage).toBe(false)
    expect(result.current.hasPreviousPage).toBe(false)
  })

  it('初期化時の isLoading は true から false に遷移', async () => {
    // Arrange
    ;(fetchEntries as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(MOCK_TIMELINE_PAGE), 100)
        )
    )

    // Act
    const { result } = renderHook(
      () => useTimeline({ userId: TEST_USER_ID }),
      { wrapper: createWrapper() }
    )

    // Assert - 初期状態は loading
    expect(result.current.isLoading).toBe(true)

    // ローディング完了待ち
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('initialDate指定時に指定日付のカーソルを使用', async () => {
    // Arrange
    const initialDate = new Date('2026-01-17')
    ;(fetchEntries as jest.Mock).mockResolvedValue(MOCK_TIMELINE_PAGE)

    // Act
    renderHook(
      () => useTimeline({ userId: TEST_USER_ID, initialDate }),
      { wrapper: createWrapper() }
    )

    // Assert
    await waitFor(() => {
      expect(fetchEntries).toHaveBeenCalled()
    })

    // initialDate が JST の日付に変換されてカーソルに使用されることを確認
    const callArgs = (fetchEntries as jest.Mock).mock.calls[0][0]
    expect(callArgs.userId).toBe(TEST_USER_ID)
    expect(callArgs.cursor).toBeDefined()
  })

  it('pageSize カスタマイズ: 指定した値で fetchEntries を呼び出し', async () => {
    // Arrange
    ;(fetchEntries as jest.Mock).mockResolvedValue(MOCK_TIMELINE_PAGE)

    // Act
    renderHook(
      () => useTimeline({ userId: TEST_USER_ID, pageSize: 50 }),
      { wrapper: createWrapper() }
    )

    // Assert
    await waitFor(() => {
      expect(fetchEntries).toHaveBeenCalled()
    })

    const callArgs = (fetchEntries as jest.Mock).mock.calls[0][0]
    expect(callArgs.limit).toBe(50)
  })
})
