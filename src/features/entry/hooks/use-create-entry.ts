'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { toast } from 'sonner'
import { createEntry } from '../api/service'
import { saveDraft, clearDraft } from '../api/draft-storage'
import type { CreateEntryInput, Entry } from '../types'
import type { TimelineEntry, TimelinePage } from '@/features/timeline/types'
import type { InfiniteData } from '@tanstack/react-query'

interface UseCreateEntryOptions {
  userId: string
  // 投稿成功時のコールバック（遷移前に呼ばれる）
  onSuccess?: () => void
}

interface SubmitOptions {
  // 楽観的UIを使用するか（デフォルト: true）
  optimistic?: boolean
}

interface UseCreateEntryReturn {
  // 楽観的UI対応の投稿関数
  submit: (input: CreateEntryInput, options?: SubmitOptions) => Promise<void>
  // 投稿中かどうか
  isPending: boolean
  // エラー
  error: Error | null
}

// 楽観的エントリを生成
function createOptimisticEntry(
  userId: string,
  input: CreateEntryInput
): TimelineEntry {
  const now = new Date()
  // 日本時間でYYYY-MM-DD形式を取得
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const date = jstDate.toISOString().split('T')[0]

  return {
    id: `optimistic-${Date.now()}`, // 一時的なID
    userId,
    content: input.content,
    imageUrls: input.imageUrls,
    createdAt: now,
    date,
  }
}

/**
 * 楽観的UI対応のエントリ作成フック
 *
 * テキストのみの投稿は即座にタイムラインに遷移し、
 * バックグラウンドで保存処理を実行します。
 * 失敗時はToast通知と下書き復元を行います。
 */
export function useCreateEntry(options: UseCreateEntryOptions): UseCreateEntryReturn {
  const { userId, onSuccess } = options
  const queryClient = useQueryClient()
  const router = useRouter()

  // 現在のsubmitがoptimisticかどうかを追跡
  const isOptimisticRef = useRef(false)

  const mutation = useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      const result = await createEntry(input)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.value
    },

    // 楽観的更新: 送信前にキャッシュを更新
    onMutate: async (input: CreateEntryInput) => {
      // 楽観的UIが無効な場合はスキップ
      if (!isOptimisticRef.current) {
        return { previousData: undefined, optimisticEntry: undefined }
      }

      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['timeline', userId] })

      // 現在のキャッシュを保存（ロールバック用）
      const previousData = queryClient.getQueryData<InfiniteData<TimelinePage>>([
        'timeline',
        userId,
        undefined, // initialCursor
      ])

      // 楽観的エントリを生成
      const optimisticEntry = createOptimisticEntry(userId, input)

      // キャッシュを楽観的に更新
      queryClient.setQueryData<InfiniteData<TimelinePage>>(
        ['timeline', userId, undefined],
        (old) => {
          if (!old) return old

          // 最初のページの先頭に楽観的エントリを追加
          const newPages = [...old.pages]
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              entries: [optimisticEntry, ...newPages[0].entries],
            }
          }

          return {
            ...old,
            pages: newPages,
          }
        }
      )

      // 下書きを保存（失敗時の復元用）
      saveDraft({
        content: input.content,
        imagePreview: null,
        savedAt: new Date().toISOString(),
      })

      return { previousData, optimisticEntry }
    },

    // エラー時: キャッシュをロールバック
    onError: (error, _input, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['timeline', userId, undefined],
          context.previousData
        )
      }

      // Toast通知（穏やかに、再編集への導線を提供）
      toast.error('投稿できませんでした', {
        description: error.message || 'もう一度お試しください',
        action: {
          label: '再編集',
          onClick: () => {
            // 下書きは既に保存されているので、/newに遷移すれば復元される
            router.push('/new')
          },
        },
        duration: 6000, // エラーは長めに表示
      })
    },

    // 成功時: 下書きを削除、キャッシュを再検証
    onSuccess: (data: Entry, _input, context) => {
      // 下書きを削除
      clearDraft()

      // 楽観的エントリを実際のエントリに置き換え
      if (context?.optimisticEntry) {
        queryClient.setQueryData<InfiniteData<TimelinePage>>(
          ['timeline', userId, undefined],
          (old) => {
            if (!old) return old

            const newPages = old.pages.map((page) => ({
              ...page,
              entries: page.entries.map((entry) =>
                entry.id === context.optimisticEntry?.id
                  ? {
                      id: data.id,
                      userId: data.user_id,
                      content: data.content,
                      imageUrls: data.image_urls,
                      createdAt: new Date(data.created_at),
                      date: context.optimisticEntry.date,
                    }
                  : entry
              ),
            }))

            return { ...old, pages: newPages }
          }
        )
      }
    },

    // 完了時（成功・失敗問わず）: キャッシュを再検証
    onSettled: () => {
      // 少し遅延させて再検証（楽観的更新のアニメーションを妨げない）
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['timeline', userId] })
      }, 1000)
    },
  })

  const submit = async (
    input: CreateEntryInput,
    submitOptions?: SubmitOptions
  ): Promise<void> => {
    const optimistic = submitOptions?.optimistic ?? true

    // refに現在の楽観的フラグを設定
    isOptimisticRef.current = optimistic

    // コールバックを先に実行（遷移アニメーション等）
    onSuccess?.()

    // 楽観的UIの場合は即座にタイムラインへ遷移
    if (optimistic) {
      router.push('/timeline')
    }

    // バックグラウンドで投稿処理を実行
    await mutation.mutateAsync(input)
  }

  return {
    submit,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
