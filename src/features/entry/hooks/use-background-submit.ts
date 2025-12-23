'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { usePendingEntryStore } from '@/stores/pending-entry-store'
import { uploadImage } from '@/features/entry/api/image-service'
import { createEntry } from '@/features/entry/api/service'
import { clearDraft } from '@/features/entry/api/draft-storage'

// バックグラウンドでエントリを保存するフック
// タイムラインページで使用し、ペンディング投稿を処理する
export function useBackgroundSubmit(userId: string) {
  const pendingEntry = usePendingEntryStore((s) => s.pendingEntry)
  const setStatus = usePendingEntryStore((s) => s.setStatus)
  const clear = usePendingEntryStore((s) => s.clear)
  const queryClient = useQueryClient()
  const router = useRouter()

  // 処理中フラグ（二重実行防止）
  const isProcessing = useRef(false)

  useEffect(() => {
    // ペンディング投稿がないか、既に処理中なら何もしない
    if (!pendingEntry || pendingEntry.status !== 'pending' || isProcessing.current) {
      return
    }

    const submit = async () => {
      isProcessing.current = true

      try {
        // ステータス: アップロード中
        setStatus('uploading')

        // 画像アップロード
        const imageUrls: string[] = []
        for (const img of pendingEntry.images) {
          const result = await uploadImage(img.file, userId)
          if (!result.ok) {
            throw new Error(result.error.message)
          }
          imageUrls.push(result.value)
        }

        // ステータス: 保存中
        setStatus('saving')

        // DB保存
        const result = await createEntry({
          content: pendingEntry.content,
          imageUrls: imageUrls.length > 0 ? imageUrls : null,
        })

        if (!result.ok) {
          throw new Error(result.error.message)
        }

        // 成功
        setStatus('success')

        // 下書きを削除
        clearDraft()

        // タイムラインのキャッシュを無効化して再取得
        await queryClient.invalidateQueries({ queryKey: ['timeline'] })
        await queryClient.invalidateQueries({ queryKey: ['calendar'] })

        // 少し待ってからクリア
        setTimeout(() => {
          clear()
          isProcessing.current = false
        }, 500)
      } catch (error) {
        // 失敗
        const errorMessage = error instanceof Error ? error.message : '投稿に失敗しました'
        setStatus('failed', errorMessage)
        isProcessing.current = false

        // トースト通知
        toast.error('投稿できませんでした', {
          description: errorMessage,
          action: {
            label: '再編集',
            onClick: () => {
              // 失敗状態をクリアして編集画面へ
              clear()
              router.push('/new')
            },
          },
          duration: 10000, // 10秒間表示
        })
      }
    }

    submit()
  }, [pendingEntry, userId, setStatus, clear, queryClient, router])
}
