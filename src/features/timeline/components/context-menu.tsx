'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

export interface ContextMenuProps {
  position: { x: number; y: number }
  entryId: string
  onClose: () => void
}

export function ContextMenu({ position, entryId, onClose }: ContextMenuProps) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Escapeキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // フォーカス管理
  useEffect(() => {
    menuRef.current?.focus()
  }, [])

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* メニュー */}
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        className="fixed z-50 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <button
          role="menuitem"
          onClick={handleEdit}
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          編集
        </button>
        <button
          role="menuitem"
          onClick={handleDelete}
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
        >
          削除
        </button>
      </div>
    </>
  )
}
