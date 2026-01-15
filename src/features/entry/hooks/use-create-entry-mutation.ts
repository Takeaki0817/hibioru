'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/constants/query-keys'
import { createEntry } from '@/features/entry/api/actions'
import { uploadImage } from '@/features/entry/api/image-service'
import type { TimelinePage, TimelineEntry } from '@/features/timeline/types'
import type { CompressedImage } from '@/features/entry/types'
import { getJSTDateString } from '@/lib/date-utils'

interface CreateEntryMutationInput {
  content: string
  images: CompressedImage[]
  existingImageUrls: string[]
  removedImageUrls: Set<string>
  isShared: boolean
}

interface UseCreateEntryMutationOptions {
  userId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface MutationContext {
  previousData: Map<string, InfiniteData<TimelinePage> | undefined>
  optimisticId: string
}

/**
 * エントリ作成の楽観的更新を提供するMutationフック
 *
 * 責務:
 * - 画像アップロード
 * - Server Action呼び出し
 * - 楽観的更新とロールバック
 * - キャッシュの同期
 */
export function useCreateEntryMutation({
  userId,
  onSuccess,
  onError,
}: UseCreateEntryMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateEntryMutationInput) => {
      // 1. 新規画像をアップロード
      const uploadedUrls: string[] = []
      for (const img of input.images) {
        const result = await uploadImage(img.file, userId)
        if (!result.ok) {
          throw new Error(result.error.message)
        }
        uploadedUrls.push(result.value)
      }

      // 2. 既存画像（削除されていないもの）と結合
      const keptExistingUrls = input.existingImageUrls.filter(
        (url) => !input.removedImageUrls.has(url)
      )
      const finalImageUrls = [...uploadedUrls, ...keptExistingUrls]

      // 3. Server Action呼び出し
      const result = await createEntry({
        content: input.content,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : null,
        isShared: input.isShared,
      })

      if (result.serverError) {
        throw new Error(result.serverError)
      }
      if (!result.data) {
        throw new Error('エントリの作成に失敗しました')
      }

      return result.data
    },

    onMutate: async (input): Promise<MutationContext> => {
      // 進行中のタイムラインクエリをキャンセル（部分一致）
      await queryClient.cancelQueries({
        queryKey: ['entries', 'timeline', userId],
        exact: false,
      })

      // 全てのタイムラインキャッシュを保存（ロールバック用）
      const previousData = new Map<string, InfiniteData<TimelinePage> | undefined>()
      const queryCache = queryClient.getQueryCache()
      const queries = queryCache.findAll({
        queryKey: ['entries', 'timeline', userId],
        exact: false,
      })

      for (const query of queries) {
        const key = JSON.stringify(query.queryKey)
        previousData.set(key, query.state.data as InfiniteData<TimelinePage> | undefined)
      }

      // 楽観的エントリを生成
      const optimisticId = `optimistic-${Date.now()}`
      const now = new Date()

      // プレビューURLを使用（新規画像）+ 既存画像（削除されていないもの）
      const previewUrls = input.images.map((img) => img.previewUrl)
      const keptExistingUrls = input.existingImageUrls.filter(
        (url) => !input.removedImageUrls.has(url)
      )
      const optimisticImageUrls = [...previewUrls, ...keptExistingUrls]

      const optimisticEntry: TimelineEntry = {
        id: optimisticId,
        userId,
        content: input.content,
        imageUrls: optimisticImageUrls.length > 0 ? optimisticImageUrls : null,
        createdAt: now,
        date: getJSTDateString(now),
      }

      // 全てのタイムラインキャッシュを更新
      queryClient.setQueriesData<InfiniteData<TimelinePage>>(
        { queryKey: ['entries', 'timeline', userId], exact: false },
        (oldData) => {
          // 既存のキャッシュがある場合、楽観的エントリを先頭に追加
          if (oldData?.pages?.[0]) {
            return {
              ...oldData,
              pages: [
                {
                  ...oldData.pages[0],
                  entries: [optimisticEntry, ...oldData.pages[0].entries],
                },
                ...oldData.pages.slice(1),
              ],
            }
          }

          // キャッシュが存在しない場合、新規作成
          return {
            pages: [
              {
                entries: [optimisticEntry],
                nextCursor: null,
                prevCursor: null,
              },
            ],
            pageParams: [{ cursor: undefined, direction: 'before' }],
          }
        }
      )

      // リダイレクト時にタイムラインが確実に楽観的更新されたキャッシュを読み込めるように、
      // cursorなし（undefined）のタイムラインキーに確実にキャッシュをセット
      const defaultTimelineKey = queryKeys.entries.timeline(userId, undefined)
      const existingCache = queryClient.getQueryData<InfiniteData<TimelinePage>>(defaultTimelineKey)

      if (!existingCache) {
        queryClient.setQueryData<InfiniteData<TimelinePage>>(defaultTimelineKey, {
          pages: [
            {
              entries: [optimisticEntry],
              nextCursor: null,
              prevCursor: null,
            },
          ],
          pageParams: [{ cursor: undefined, direction: 'before' }],
        })
      } else {
        // 既存のキャッシュがある場合も、楽観的エントリが先頭にあることを確認
        const firstPage = existingCache.pages[0]
        if (firstPage && !firstPage.entries.some((e) => e.id === optimisticId)) {
          queryClient.setQueryData<InfiniteData<TimelinePage>>(defaultTimelineKey, {
            ...existingCache,
            pages: [
              {
                ...firstPage,
                entries: [optimisticEntry, ...firstPage.entries],
              },
              ...existingCache.pages.slice(1),
            ],
          })
        }
      }

      return { previousData, optimisticId }
    },

    onError: (error, _input, context) => {
      // ロールバック
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          const queryKey = JSON.parse(key)
          queryClient.setQueryData(queryKey, data)
        }
      }

      // エラートーストを表示
      toast.error('投稿に失敗しました', {
        description: error instanceof Error ? error.message : undefined,
      })

      onError?.(error instanceof Error ? error : new Error('投稿に失敗しました'))
    },

    onSuccess: (createdEntry, input) => {
      // 楽観的エントリを実際のエントリで置換
      const actualEntry: TimelineEntry = {
        id: createdEntry.id,
        userId: createdEntry.user_id,
        content: createdEntry.content,
        imageUrls: createdEntry.image_urls,
        createdAt: new Date(createdEntry.created_at),
        date: getJSTDateString(new Date(createdEntry.created_at)),
      }

      queryClient.setQueriesData<InfiniteData<TimelinePage>>(
        { queryKey: ['entries', 'timeline', userId], exact: false },
        (oldData) => {
          if (!oldData?.pages) {
            // キャッシュが存在しない場合、実際のエントリを含む新規キャッシュを作成
            return {
              pages: [
                {
                  entries: [actualEntry],
                  nextCursor: null,
                  prevCursor: null,
                },
              ],
              pageParams: [{ cursor: undefined, direction: 'before' }],
            }
          }

          // 1. すべてのページから楽観的エントリを削除
          const pagesWithoutOptimistic = oldData.pages.map((page) => ({
            ...page,
            entries: page.entries.filter(
              (entry) => !entry.id.startsWith('optimistic-')
            ),
          }))

          // 2. 最初のページに実際のエントリを追加（重複チェック付き）
          const firstPage = pagesWithoutOptimistic[0]
          const hasActualEntry = firstPage.entries.some(
            (entry) => entry.id === actualEntry.id
          )

          if (!hasActualEntry) {
            pagesWithoutOptimistic[0] = {
              ...firstPage,
              entries: [actualEntry, ...firstPage.entries],
            }
          }

          return {
            ...oldData,
            pages: pagesWithoutOptimistic,
          }
        }
      )

      // カレンダーキャッシュを無効化（新しい日付が追加された可能性）
      queryClient.invalidateQueries({
        queryKey: queryKeys.entries.calendar(userId, new Date().getFullYear(), new Date().getMonth() + 1),
      })

      // 全日付キャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: queryKeys.entries.dates(userId),
      })

      // ソーシャルフィードを無効化（共有時のみ）
      if (input.isShared) {
        queryClient.invalidateQueries({ queryKey: queryKeys.social.feed() })
      }

      onSuccess?.()
    },

    retry: false,
  })
}
