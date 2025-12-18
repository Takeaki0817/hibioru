'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TimelineEntry } from '../types'
import { ContextMenu } from './context-menu'
import { Card, CardContent } from '@/components/ui/card'

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
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={handleTap}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        <CardContent className="pt-4 pb-4">
          <div className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

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
