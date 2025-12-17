'use client'

import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTimeline } from '@/hooks/timeline/useTimeline'
import { useScrollSync } from '@/hooks/timeline/useScrollSync'
import { EntryCard } from './EntryCard'

export interface TimelineListProps {
  userId: string
}

export function TimelineList({ userId }: TimelineListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    entries,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useTimeline({ userId })

  const { handleScroll } = useScrollSync({
    containerRef,
    entries,
  })

  // 仮想スクロール設定
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 120, // 推定の行高さ
    overscan: 5, // 表示領域外に事前レンダリングする行数
  })

  // スクロールイベント
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // 無限スクロール: 最後の要素が見えたら次ページを取得
  useEffect(() => {
    const items = virtualizer.getVirtualItems()
    if (items.length === 0) return

    const lastItem = items[items.length - 1]
    if (lastItem && lastItem.index >= entries.length - 1 && hasNextPage) {
      fetchNextPage()
    }
  }, [virtualizer, entries.length, hasNextPage, fetchNextPage])

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-red-600">エラーが発生しました</div>
        <div className="text-sm text-gray-500">{error?.message}</div>
        <button
          onClick={() => refetch()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-500">
          <p>まだ投稿がありません</p>
          <p className="mt-2 text-sm">最初の記録を作成しましょう</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index]
          return (
            <div
              key={entry.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="px-4 py-2"
            >
              <EntryCard entry={entry} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
