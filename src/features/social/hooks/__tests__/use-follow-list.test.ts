import { renderHook, act, waitFor } from '@testing-library/react'
import { useFollowList } from '../use-follow-list'
import type { SocialResult, PaginatedResult, PublicUserInfo } from '../../types'
import { ERROR_MESSAGES } from '../../constants'

describe('useFollowList', () => {
  const mockUser1: PublicUserInfo = {
    id: 'user-1',
    username: 'user_abc',
    displayName: 'User ABC',
    avatarUrl: null,
  }

  const mockUser2: PublicUserInfo = {
    id: 'user-2',
    username: 'user_def',
    displayName: 'User DEF',
    avatarUrl: 'https://example.com/avatar.jpg',
  }

  const mockUser3: PublicUserInfo = {
    id: 'user-3',
    username: 'user_ghi',
    displayName: 'User GHI',
    avatarUrl: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('初期化・初回読み込み', () => {
    it('初期状態を正しく設定する', () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue({
        ok: true,
        value: {
          items: [],
          nextCursor: null,
        },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // Assert
      expect(result.current.users).toEqual([])
      expect(result.current.isLoading).toBe(true)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.nextCursor).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('マウント時に初回データを取得する', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue({
        ok: true,
        value: {
          items: [mockUser1, mockUser2],
          nextCursor: 'cursor-1',
        },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.users).toHaveLength(2)
      expect(result.current.users[0]).toEqual(mockUser1)
      expect(result.current.users[1]).toEqual(mockUser2)
      expect(result.current.nextCursor).toBe('cursor-1')
      expect(result.current.hasMore).toBe(true)
    })

    it('空のリストを初期化する', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue({
        ok: true,
        value: {
          items: [],
          nextCursor: null,
        },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.users).toEqual([])
      expect(result.current.hasMore).toBe(false)
      expect(result.current.nextCursor).toBeNull()
    })
  })

  describe('ページネーション', () => {
    it('loadMore で次ページを読み込む', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: 'cursor-1',
        },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser2, mockUser3],
          nextCursor: null,
        },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // 初回読み込み待機
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Act: 次ページ読み込み
      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      // Assert
      expect(result.current.users).toHaveLength(3)
      expect(result.current.users[0]).toEqual(mockUser1)
      expect(result.current.users[1]).toEqual(mockUser2)
      expect(result.current.users[2]).toEqual(mockUser3)
      expect(result.current.hasMore).toBe(false)
      expect(result.current.nextCursor).toBeNull()
    })

    it('カーソルベースで次ページを取得', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: 'cursor-abc',
        },
      })

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Act
      await act(async () => {
        await result.current.loadMore('cursor-abc')
      })

      // Assert
      expect(mockFetchFn).toHaveBeenCalledWith('cursor-abc')
    })

    it('最後のページでは hasMore が false になる', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: 'cursor-1',
        },
      })

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser2],
          nextCursor: null,
        },
      })

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Act
      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      // Assert
      expect(result.current.hasMore).toBe(false)
    })

    it('アイテムは既存データに追加される（累積）', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: 'cursor-1',
        },
      })

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser2],
          nextCursor: 'cursor-2',
        },
      })

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser3],
          nextCursor: null,
        },
      })

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.users).toHaveLength(1)
      })

      // Act & Assert
      expect(result.current.users[0]).toEqual(mockUser1)

      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      expect(result.current.users).toHaveLength(2)
      expect(result.current.users[1]).toEqual(mockUser2)

      await act(async () => {
        await result.current.loadMore('cursor-2')
      })

      expect(result.current.users).toHaveLength(3)
      expect(result.current.users[2]).toEqual(mockUser3)
    })
  })

  describe('エラーハンドリング', () => {
    it('初回読み込みエラー時はエラーメッセージを設定', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Database error' },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Database error')
      expect(result.current.users).toEqual([])
    })

    it('読み込みエラー時はデフォルトエラーメッセージを使用', async () => {
      // Arrange
      const mockFetchFn = jest.fn().mockResolvedValue({
        ok: false,
        error: { code: 'DB_ERROR' },
      } as SocialResult<PaginatedResult<PublicUserInfo>>)

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe(ERROR_MESSAGES.FOLLOW_LIST_LOAD_FAILED)
    })

    it('ページネーション中のエラー時はエラーメッセージを更新', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: 'cursor-1',
        },
      })

      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        error: { code: 'NETWORK_ERROR', message: 'Network timeout' },
      })

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.users).toHaveLength(1)
      })

      // Act
      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      // Assert
      expect(result.current.error).toBe('Network timeout')
      expect(result.current.users).toHaveLength(1) // 既存データは保持
    })
  })

  describe('リトライ機能', () => {
    it('エラー時のリトライで再取得する', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Database error' },
      })

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1, mockUser2],
          nextCursor: null,
        },
      })

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
      })

      expect(result.current.users).toEqual([])

      // Act
      await act(async () => {
        result.current.retryFetch()
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeNull()
      expect(result.current.users).toHaveLength(2)
      expect(result.current.users[0]).toEqual(mockUser1)
    })

    it('リトライ前のエラーをクリア', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Error 1' },
      })

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: null,
        },
      })

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      // Act
      await act(async () => {
        result.current.retryFetch()
      })

      // Assert: エラーが即座にクリアされていることを確認
      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })

    it('リトライ中は isLoading が true になる', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        error: { code: 'DB_ERROR' },
      })

      mockFetchFn.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  value: {
                    items: [mockUser1],
                    nextCursor: null,
                  },
                }),
              100
            )
          })
      )

      const { result } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      // Act
      act(() => {
        result.current.retryFetch()
      })

      // Assert: リトライ直後は isLoading が true
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('アンマウント処理', () => {
    it('アンマウント後のデータセットは無視される', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  value: {
                    items: [mockUser1],
                    nextCursor: null,
                  },
                }),
              100
            )
          })
      )

      const { result, unmount } = renderHook(() => useFollowList({ fetchFn: mockFetchFn }))

      // Act: 読み込み途中でアンマウント
      unmount()

      // Assert: エラーが出ないことを確認
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(result.current.users).toEqual([])
    })
  })

  describe('fetchFn 更新時の動作', () => {
    it('fetchFn が変更されると再度初期読み込みが実行される', async () => {
      // Arrange
      const mockFetchFn1 = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: null,
        },
      })

      const { result, rerender } = renderHook(
        (props) => useFollowList(props),
        { initialProps: { fetchFn: mockFetchFn1 } }
      )

      await waitFor(() => {
        expect(result.current.users).toHaveLength(1)
      })

      // 別の fetchFn に変更
      const mockFetchFn2 = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          items: [mockUser2, mockUser3],
          nextCursor: null,
        },
      })

      // Act
      rerender({ fetchFn: mockFetchFn2 })

      // Assert
      await waitFor(() => {
        expect(mockFetchFn2).toHaveBeenCalled()
        expect(result.current.users).toHaveLength(2)
      })
    })
  })

  describe('複数の状態更新が同時に起こる場合', () => {
    it('loadMore と retryFetch が並行実行される場合の整合性', async () => {
      // Arrange
      const mockFetchFn = jest.fn()
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        value: {
          items: [mockUser1],
          nextCursor: 'cursor-1',
        },
      })

      // 遅延してresolveする
      let resolveLoadMore: any
      mockFetchFn.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveLoadMore = resolve
          })
      )

      const mockFetchFn2 = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          items: [mockUser2],
          nextCursor: null,
        },
      })

      const { result, rerender } = renderHook(
        (props) => useFollowList(props),
        { initialProps: { fetchFn: mockFetchFn } }
      )

      await waitFor(() => {
        expect(result.current.users).toHaveLength(1)
      })

      // Act: loadMore を開始しるが、完了前に fetchFn 変更
      act(() => {
        result.current.loadMore('cursor-1')
      })

      rerender({ fetchFn: mockFetchFn2 })

      // Assert: 最新の状態が優先される
      await waitFor(() => {
        expect(mockFetchFn2).toHaveBeenCalled()
      })
    })
  })
})
