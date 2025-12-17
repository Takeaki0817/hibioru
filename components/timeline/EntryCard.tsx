'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TimelineEntry } from '@/lib/timeline/types'
import { ContextMenu } from './ContextMenu'

export interface EntryCardProps {
  entry: TimelineEntry
}

export function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)

  // タップ処理
  const handleTap = useCallback(() => {
    if (!showMenu) {
      router.push(`/edit/${entry.id}`)
    }
  }, [router, entry.id, showMenu])

  // 長押し開始
  const handlePressStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const timer = setTimeout(() => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      setMenuPosition({ x: clientX, y: clientY })
      setShowMenu(true)
    }, 500) // 500ms長押し

    setPressTimer(timer)
  }, [])

  // 長押しキャンセル
  const handlePressEnd = useCallback(() => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }, [pressTimer])

  // メニューを閉じる
  const handleCloseMenu = useCallback(() => {
    setShowMenu(false)
  }, [])

  return (
    <>
      <div
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        onClick={handleTap}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        <div className="text-sm text-gray-500">
          {entry.createdAt.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div className="mt-2 whitespace-pre-wrap break-words">{entry.content}</div>
        {entry.imageUrl && (
          <img
            src={entry.imageUrl}
            alt="投稿画像"
            className="mt-3 max-h-64 w-full rounded object-cover"
            loading="lazy"
          />
        )}
      </div>

      {showMenu && (
        <ContextMenu
          position={menuPosition}
          entryId={entry.id}
          onClose={handleCloseMenu}
        />
      )}
    </>
  )
}
