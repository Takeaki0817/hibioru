'use client'

import { useCallback } from 'react'
import { format } from 'date-fns'
import { X, ClockAlert } from 'lucide-react'
import { EntryHeader } from '@/components/layouts/entry-header'
import { FooterNav } from '@/components/layouts/footer-nav'

interface NotEditableClientProps {
  entryDate: string // ISO形式の日付
}

export function NotEditableClient({ entryDate }: NotEditableClientProps) {
  // 投稿日付をYYYY-MM-DD形式に変換
  const dateParam = format(new Date(entryDate), 'yyyy-MM-dd')

  const handleClose = useCallback(() => {
    // タイムラインの該当日付に戻る
    window.location.href = `/timeline?date=${dateParam}`
  }, [dateParam])

  return (
    <div className="flex h-dvh flex-col">
      <EntryHeader title="編集" onClose={handleClose} />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <ClockAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">編集できません</h2>
          <p className="text-muted-foreground">
            編集可能期間（24時間）を過ぎています
          </p>
        </div>
      </main>

      <FooterNav
        centerButton={{
          icon: X,
          onClick: handleClose,
        }}
      />
    </div>
  )
}
