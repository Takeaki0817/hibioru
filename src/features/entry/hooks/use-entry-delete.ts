'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

  // Zustandストアから必要な状態とアクションを取得
  const showDeleteConfirm = useEntryFormStore((s) => s.showDeleteConfirm)
  const isDeleting = useEntryFormStore((s) => s.isDeleting)
  const setShowDeleteConfirm = useEntryFormStore((s) => s.setShowDeleteConfirm)
  const deleteStart = useEntryFormStore((s) => s.deleteStart)
  const deleteError = useEntryFormStore((s) => s.deleteError)

  // 削除確認ダイアログを表示
  const handleShowDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [setShowDeleteConfirm])

  // 削除確認ダイアログの開閉（削除中は閉じない）
  const handleCloseDeleteConfirm = useCallback(
    (open: boolean) => {
      if (!isDeleting) {
        setShowDeleteConfirm(open)
      }
    },
    [isDeleting, setShowDeleteConfirm]
  )

  // 削除処理
  const handleDelete = useCallback(async () => {
    if (!initialEntry) return

    deleteStart()

    try {
      const result = await deleteEntry({ id: initialEntry.id })

      if (result.serverError) {
        deleteError(result.serverError)
        return
      }

      // タイムラインに戻る
      router.push('/timeline')
    } catch (err) {
      deleteError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }, [initialEntry, deleteStart, deleteError, router])

  return {
    showDeleteConfirm,
    isDeleting,
    handleShowDeleteConfirm,
    handleCloseDeleteConfirm,
    handleDelete,
  }
}
