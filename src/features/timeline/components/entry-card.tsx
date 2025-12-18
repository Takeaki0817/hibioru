'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { TimelineEntry } from '../types'
import { ContextMenu } from './context-menu'
import { cn } from '@/lib/utils'

export interface EntryCardProps {
  entry: TimelineEntry
}

// カードのアニメーション設定
const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  hover: {
    backgroundColor: 'var(--primary-50)',
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  tap: {
    backgroundColor: 'var(--primary-100)',
    scale: 0.99,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
}

// 絵文字のみかどうかを判定
function isEmojiOnly(content: string): boolean {
  // 絵文字の正規表現パターン（絵文字とスペースのみ）
  const emojiRegex = /^[\p{Emoji}\s]+$/u
  const trimmed = content.trim()

  // 短い（20文字以下）かつ絵文字のみの場合
  return trimmed.length <= 20 && emojiRegex.test(trimmed)
}

export function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)

  // 絵文字のみかどうか
  const emojiOnly = useMemo(() => isEmojiOnly(entry.content), [entry.content])

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
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
        className={cn(
          'relative cursor-pointer rounded-xl',
          'transition-colors',
          // セパレータ線（擬似要素）
          'after:absolute after:bottom-0 after:left-4 after:right-4',
          'after:h-px after:bg-border'
        )}
        onClick={handleTap}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        <div className="px-4 py-6">
          {/* 時刻表示 */}
          <div className="text-xs text-muted-foreground font-medium">
            {entry.createdAt.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          {/* コンテンツ表示 */}
          {emojiOnly ? (
            // 絵文字のみの場合：中央配置・大きく表示
            <div className="mt-3 flex items-center justify-center py-4">
              <span className="text-5xl">{entry.content.trim()}</span>
            </div>
          ) : (
            // 通常テキストの場合
            <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {entry.content}
            </div>
          )}

          {/* 画像表示 */}
          {entry.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg">
              <img
                src={entry.imageUrl}
                alt="投稿画像"
                className="max-h-64 w-full object-cover transition-transform hover:scale-105"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </motion.div>

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
