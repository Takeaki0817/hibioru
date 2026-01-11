/**
 * useFollowList フックのユニットテスト
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useFollowList } from '../use-follow-list'
import type { SocialResult, PaginatedResult, PublicUserInfo } from '../../types'

// テスト用ユーザーデータ作成ヘルパー
const createMockUser = (overrides: Partial<PublicUserInfo> = {}): PublicUserInfo => ({
  id: `user-${Math.random().toString(36).slice(2)}`,
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  ...overrides,
})

// 成功レスポンス作成ヘルパー
const createSuccessResult = (
  items: PublicUserInfo[],
  nextCursor: string | null = null
): SocialResult<PaginatedResult<PublicUserInfo>> => ({
  ok: true,
  value: { items, nextCursor },
})

// エラーレスポンス作成ヘルパー
const createErrorResult = (
  message: string
): SocialResult<PaginatedResult<PublicUserInfo>> => ({
  ok: false,
  error: { code: 'DB_ERROR', message },
})

describe('useFollowList', () => {
  describe('初期状態', () => {
    it('isLoadingがtrueであること', () => {
      // Arrange
      const fetchFn = jest.fn().mockImplementation(() => new Promise(() => {})) // 永遠にペンディング

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      expect(result.current.isLoading).toBe(true)
      expect(result.current.users).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchFn成功時', () => {
    it('usersがセットされること', async () => {
      // Arrange
      const users = [
        createMockUser({ id: 'user-1', username: 'user1' }),
        createMockUser({ id: 'user-2', username: 'user2' }),
      ]
      const fetchFn = jest.fn().mockResolvedValue(createSuccessResult(users))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.users.length).toBe(2)
      expect(result.current.users[0].id).toBe('user-1')
      expect(result.current.users[1].id).toBe('user-2')
      expect(result.current.error).toBeNull()
    })

    it('nextCursorがある場合hasMoreがtrueになること', async () => {
      // Arrange
      const users = [createMockUser()]
      const fetchFn = jest.fn().mockResolvedValue(createSuccessResult(users, 'cursor-123'))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.hasMore).toBe(true)
      expect(result.current.nextCursor).toBe('cursor-123')
    })

    it('nextCursorがない場合hasMoreがfalseになること', async () => {
      // Arrange
      const users = [createMockUser()]
      const fetchFn = jest.fn().mockResolvedValue(createSuccessResult(users, null))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.hasMore).toBe(false)
      expect(result.current.nextCursor).toBeNull()
    })
  })

  describe('fetchFn失敗時', () => {
    it('errorがセットされること', async () => {
      // Arrange
      const fetchFn = jest.fn().mockResolvedValue(createErrorResult('ネットワークエラー'))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.error).toBe('ネットワークエラー')
      expect(result.current.users).toEqual([])
    })

    it('エラーメッセージがない場合はデフォルトメッセージが表示されること', async () => {
      // Arrange
      const fetchFn = jest.fn().mockResolvedValue({
        ok: false,
        error: undefined,
      })

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.error).toBe('フォローリストの読み込みに失敗しました')
    })
  })

  describe('loadMore', () => {
    it('追加ユーザーが既存のユーザーに追加されること', async () => {
      // Arrange
      const initialUsers = [createMockUser({ id: 'user-1' })]
      const additionalUsers = [createMockUser({ id: 'user-2' })]

      const fetchFn = jest.fn()
        .mockResolvedValueOnce(createSuccessResult(initialUsers, 'cursor-1'))
        .mockResolvedValueOnce(createSuccessResult(additionalUsers, null))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.users.length).toBe(1)

      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      // Assert
      expect(result.current.users.length).toBe(2)
      expect(result.current.users[0].id).toBe('user-1')
      expect(result.current.users[1].id).toBe('user-2')
    })

    it('loadMore完了後はisLoadingがfalseになること', async () => {
      // Arrange
      const initialUsers = [createMockUser({ id: 'user-1' })]
      const additionalUsers = [createMockUser({ id: 'user-2' })]

      const fetchFn = jest.fn()
        .mockResolvedValueOnce(createSuccessResult(initialUsers, 'cursor-1'))
        .mockResolvedValueOnce(createSuccessResult(additionalUsers, null))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // loadMore実行
      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      // Assert: loadMore完了後
      expect(result.current.isLoading).toBe(false)
      expect(result.current.users.length).toBe(2)
    })

    it('loadMore失敗時にerrorがセットされること', async () => {
      // Arrange
      const initialUsers = [createMockUser({ id: 'user-1' })]

      const fetchFn = jest.fn()
        .mockResolvedValueOnce(createSuccessResult(initialUsers, 'cursor-1'))
        .mockResolvedValueOnce(createErrorResult('ロードエラー'))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // loadMoreを実行
      await act(async () => {
        await result.current.loadMore('cursor-1')
      })

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe('ロードエラー')
      })
      // 既存のユーザーは保持される
      expect(result.current.users.length).toBe(1)
    })
  })

  describe('retryFetch', () => {
    it('エラーがクリアされ再取得されること', async () => {
      // Arrange
      const users = [createMockUser({ id: 'user-1' })]

      const fetchFn = jest.fn()
        .mockResolvedValueOnce(createErrorResult('初回エラー'))
        .mockResolvedValueOnce(createSuccessResult(users))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      await waitFor(() => {
        expect(result.current.error).toBe('初回エラー')
      })

      act(() => {
        result.current.retryFetch()
      })

      // Assert: エラーがクリアされ、isLoadingがtrue
      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.users.length).toBe(1)
      expect(result.current.error).toBeNull()
    })

    it('retryFetch後もエラーの場合は再度エラーがセットされること', async () => {
      // Arrange
      const fetchFn = jest.fn()
        .mockResolvedValueOnce(createErrorResult('初回エラー'))
        .mockResolvedValueOnce(createErrorResult('リトライエラー'))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      await waitFor(() => {
        expect(result.current.error).toBe('初回エラー')
      })

      act(() => {
        result.current.retryFetch()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Assert
      expect(result.current.error).toBe('リトライエラー')
    })
  })

  describe('isMountedパターン（アンマウント時のstate更新防止）', () => {
    it('アンマウント時にstate更新されないこと', async () => {
      // Arrange
      let resolveInitial: (value: SocialResult<PaginatedResult<PublicUserInfo>>) => void
      const fetchFn = jest.fn().mockImplementation(() => new Promise((resolve) => {
        resolveInitial = resolve
      }))

      // Act
      const { result, unmount } = renderHook(() => useFollowList({ fetchFn }))

      // フェッチ完了前にアンマウント
      unmount()

      // フェッチ完了（アンマウント後）
      await act(async () => {
        resolveInitial(createSuccessResult([createMockUser()]))
      })

      // Assert: エラーが発生しないこと（state更新されない）
      // アンマウント後なのでresultにアクセスしてもstateは初期値のまま
      // React 18ではアンマウント後のsetStateはno-opになる
      expect(result.current.isLoading).toBe(true) // 初期値のまま
    })
  })

  describe('fetchFnの再実行', () => {
    it('fetchFnが変わった場合に再取得されること', async () => {
      // Arrange
      const users1 = [createMockUser({ id: 'user-1', username: 'first' })]
      const users2 = [createMockUser({ id: 'user-2', username: 'second' })]

      const fetchFn1 = jest.fn().mockResolvedValue(createSuccessResult(users1))
      const fetchFn2 = jest.fn().mockResolvedValue(createSuccessResult(users2))

      // Act
      const { result, rerender } = renderHook(
        ({ fetchFn }) => useFollowList({ fetchFn }),
        { initialProps: { fetchFn: fetchFn1 } }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.users[0].username).toBe('first')

      // fetchFnを変更
      rerender({ fetchFn: fetchFn2 })

      await waitFor(() => {
        expect(result.current.users[0]?.username).toBe('second')
      })

      // Assert
      expect(fetchFn1).toHaveBeenCalledTimes(1)
      expect(fetchFn2).toHaveBeenCalledTimes(1)
    })
  })

  describe('空のレスポンス', () => {
    it('ユーザーが0件の場合も正常に処理されること', async () => {
      // Arrange
      const fetchFn = jest.fn().mockResolvedValue(createSuccessResult([]))

      // Act
      const { result } = renderHook(() => useFollowList({ fetchFn }))

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.users).toEqual([])
      expect(result.current.hasMore).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})
