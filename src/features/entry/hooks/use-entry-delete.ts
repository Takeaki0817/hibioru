'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useShallow } from 'zustand/shallow'
import type { Entry } from '@/features/entry/types'
import { deleteEntry } from '@/features/entry/api/actions'
import { useEntryFormStore } from '../stores/entry-form-store'

interface UseEntryDeleteOptions {
  initialEntry?: Entry
}

interface UseEntryDeleteReturn {
  showDeleteConfirm: boolean
  isDeleting: boolean
  handleShowDeleteConfirm: () => void
  handleCloseDeleteConfirm: (open: boolean) => void
  handleDelete: () => Promise<void>
}

/**
 * エントリー削除処理を管理するフック
 *
 * 責務:
 * - 削除確認ダイアログの状態管理
 * - 削除API呼び出し
 * - 削除後のリダイレクト
 */
export function useEntryDelete({
  initialEntry,
}: UseEntryDeleteOptions): UseEntryDeleteReturn {
  const router = useRouter()

  // Zustandストアから削除関連の状態とアクションをグルーピングして取得
  const deleteState = useEntryFormStore(
    useShallow((s) => ({
      showDeleteConfirm: s.showDeleteConfirm,
      isDeleting: s.isDeleting,
      setShowDeleteConfirm: s.setShowDeleteConfirm,
      deleteStart: s.deleteStart,
      deleteError: s.deleteError,
    }))
  )

  // 削除確認ダイアログを表示
  const handleShowDeleteConfirm = useCallback(() => {
    deleteState.setShowDeleteConfirm(true)
  }, [deleteState])

  // 削除確認ダイアログの開閉（削除中は閉じない）
  const handleCloseDeleteConfirm = useCallback(
    (open: boolean) => {
      if (!deleteState.isDeleting) {
        deleteState.setShowDeleteConfirm(open)
      }
    },
    [deleteState]
  )

  // 削除処理
  const handleDelete = useCallback(async () => {
    if (!initialEntry) return

    deleteState.deleteStart()

    try {
      const result = await deleteEntry({ id: initialEntry.id })

      if (result.serverError) {
        deleteState.deleteError(result.serverError)
        return
      }

      // タイムラインに戻る
      router.push('/timeline')
    } catch (err) {
      deleteState.deleteError(
        err instanceof Error ? err.message : '削除に失敗しました'
      )
    }
  }, [initialEntry, deleteState, router])

  return {
    showDeleteConfirm: deleteState.showDeleteConfirm,
    isDeleting: deleteState.isDeleting,
    handleShowDeleteConfirm,
    handleCloseDeleteConfirm,
    handleDelete,
  }
}
