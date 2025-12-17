'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export interface ContextMenuProps {
  position: { x: number; y: number }
  entryId: string
  onClose: () => void
}

export function ContextMenu({ position, entryId, onClose }: ContextMenuProps) {
  const router = useRouter()

  // 編集
  const handleEdit = useCallback(() => {
    router.push(`/edit/${entryId}`)
    onClose()
  }, [router, entryId, onClose])

  // 削除（TODO: 実装）
  const handleDelete = useCallback(() => {
    // TODO: 削除処理を実装
    console.log('削除:', entryId)
    onClose()
  }, [entryId, onClose])

  // 背景クリックで閉じる
  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleBackdropClick}
      />

      {/* メニュー */}
      <div
        className="fixed z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <button
          onClick={handleEdit}
          className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100"
        >
          編集
        </button>
        <button
          onClick={handleDelete}
          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </>
  )
}
