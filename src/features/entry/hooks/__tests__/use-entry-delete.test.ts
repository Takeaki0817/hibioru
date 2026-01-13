/**
 * useEntryDelete フックのユニットテスト
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useEntryDelete } from '../use-entry-delete'
import { useEntryFormStore } from '../../stores/entry-form-store'
import { deleteEntry } from '../../api/actions'
import type { Entry } from '../../types'

// モック設定
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

jest.mock('../../api/actions', () => ({
  deleteEntry: jest.fn(),
}))

const mockRouterPush = jest.fn()
const mockDeleteEntry = deleteEntry as jest.MockedFunction<typeof deleteEntry>

// テスト用エントリーデータ
const createMockEntry = (overrides?: Partial<Entry>): Entry => ({
  id: 'entry-1',
  userId: 'user-1',
  content: 'テスト投稿',
  imageUrls: null,
  isShared: false,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  date: '2024-01-15',
  ...overrides,
})

describe('useEntryDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useEntryFormStore.getState().reset()
  })

  describe('削除確認ダイアログ', () => {
    it('handleShowDeleteConfirmで削除確認ダイアログを表示できること', () => {
      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      expect(result.current.showDeleteConfirm).toBe(false)

      act(() => {
        result.current.handleShowDeleteConfirm()
      })

      expect(result.current.showDeleteConfirm).toBe(true)
    })

    it('handleCloseDeleteConfirmでダイアログを閉じられること', () => {
      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      // ダイアログを開く
      act(() => {
        result.current.handleShowDeleteConfirm()
      })
      expect(result.current.showDeleteConfirm).toBe(true)

      // ダイアログを閉じる
      act(() => {
        result.current.handleCloseDeleteConfirm(false)
      })
      expect(result.current.showDeleteConfirm).toBe(false)
    })

    it('削除中はダイアログを閉じられないこと', () => {
      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      // ダイアログを開く
      act(() => {
        result.current.handleShowDeleteConfirm()
      })

      // 削除中状態に設定
      act(() => {
        useEntryFormStore.getState().deleteStart()
      })

      // 閉じようとしても閉じられない
      act(() => {
        result.current.handleCloseDeleteConfirm(false)
      })

      expect(result.current.showDeleteConfirm).toBe(true)
    })
  })

  describe('削除処理', () => {
    it('削除成功時にタイムラインへ遷移すること', async () => {
      mockDeleteEntry.mockResolvedValueOnce({ data: true })

      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      await act(async () => {
        await result.current.handleDelete()
      })

      expect(mockDeleteEntry).toHaveBeenCalledWith({ id: 'entry-1' })
      expect(mockRouterPush).toHaveBeenCalledWith('/timeline')
    })

    it('initialEntryがない場合は削除処理を実行しないこと', async () => {
      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: undefined })
      )

      await act(async () => {
        await result.current.handleDelete()
      })

      expect(mockDeleteEntry).not.toHaveBeenCalled()
    })

    it('削除エラー時にエラーメッセージを設定すること', async () => {
      mockDeleteEntry.mockResolvedValueOnce({
        serverError: '削除に失敗しました',
      })

      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      await act(async () => {
        await result.current.handleDelete()
      })

      await waitFor(() => {
        expect(useEntryFormStore.getState().error).toBe('削除に失敗しました')
      })
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('例外発生時にエラーメッセージを設定すること', async () => {
      mockDeleteEntry.mockRejectedValueOnce(new Error('ネットワークエラー'))

      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      await act(async () => {
        await result.current.handleDelete()
      })

      await waitFor(() => {
        expect(useEntryFormStore.getState().error).toBe('ネットワークエラー')
      })
    })
  })

  describe('状態管理', () => {
    it('削除開始時にisDeleteingがtrueになること', async () => {
      // 非同期処理をペンディング状態にする
      let resolvePromise: (value: { data: boolean }) => void
      mockDeleteEntry.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          })
      )

      const { result } = renderHook(() =>
        useEntryDelete({ initialEntry: createMockEntry() })
      )

      // 削除処理を開始（完了を待たない）
      act(() => {
        result.current.handleDelete()
      })

      // 削除中状態を確認
      expect(result.current.isDeleting).toBe(true)

      // 削除処理を完了
      await act(async () => {
        resolvePromise!({ data: true })
      })
    })
  })
})
