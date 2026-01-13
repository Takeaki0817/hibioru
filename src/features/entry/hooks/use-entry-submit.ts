'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { Entry, CompressedImage } from '@/features/entry/types'
import { updateEntry } from '@/features/entry/api/actions'
import { uploadImage } from '@/features/entry/api/image-service'
import { clearDraft } from '@/features/entry/api/draft-storage'
import { queryKeys } from '@/lib/constants/query-keys'
import { useEntryFormStore } from '../stores/entry-form-store'
import { useCreateEntryMutation } from './use-create-entry-mutation'

interface UseEntrySubmitOptions {
  mode: 'create' | 'edit'
  initialEntry?: Entry
  userId: string
  onSuccess?: () => void
}

interface UseEntrySubmitReturn {
  formRef: React.RefObject<HTMLFormElement | null>
  handleSubmit: (e: React.FormEvent) => Promise<void>
  submitForm: () => void
}

/**
 * エントリー送信ロジックを管理するフック
 *
 * 責務:
 * - 画像アップロード処理
 * - エントリー作成/更新API呼び出し
 * - 送信後のキャッシュ無効化
 * - サクセスオーバーレイの制御
 *
 * createモードでは楽観的更新を使用（即座にUIに反映）
 */
export function useEntrySubmit({
  mode,
  initialEntry,
  userId,
  onSuccess,
}: UseEntrySubmitOptions): UseEntrySubmitReturn {
  const formRef = useRef<HTMLFormElement | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Zustandストアから必要な状態とアクションを取得
  const content = useEntryFormStore((s) => s.content)
  const images = useEntryFormStore((s) => s.images)
  const existingImageUrls = useEntryFormStore((s) => s.existingImageUrls)
  const removedImageUrls = useEntryFormStore((s) => s.removedImageUrls)
  const isShared = useEntryFormStore((s) => s.isShared)
  const submitStart = useEntryFormStore((s) => s.submitStart)
  const submitSuccess = useEntryFormStore((s) => s.submitSuccess)
  const submitError = useEntryFormStore((s) => s.submitError)
  const reset = useEntryFormStore((s) => s.reset)

  // リダイレクトのタイマーを保持（エラー時にキャンセルするため）
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // createモード用の楽観的更新Mutation
  // 即時リダイレクト最適化: onSuccess/onErrorは空（処理はmutation内で完結）
  const createMutation = useCreateEntryMutation({
    userId,
    onSuccess: () => {
      // キャッシュ更新はmutation内で完了、リダイレクトは即時実行済み
    },
    onError: () => {
      // エラー時はリダイレクトをキャンセル
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
      // エラーメッセージはmutation内でtoast表示済み
      submitError('投稿に失敗しました')
    },
  })

  // 画像アップロード処理（editモード用）
  const uploadImages = useCallback(
    async (imagesToUpload: CompressedImage[]): Promise<string[] | null> => {
      const uploadedUrls: string[] = []

      for (const img of imagesToUpload) {
        const uploadResult = await uploadImage(img.file, userId)
        if (!uploadResult.ok) {
          submitError(uploadResult.error.message)
          return null
        }
        uploadedUrls.push(uploadResult.value)
      }

      return uploadedUrls
    },
    [userId, submitError]
  )

  // 画像URL配列の構築（editモード用）
  const buildImageUrls = useCallback(
    (uploadedUrls: string[]): string[] | null => {
      const allUrls = [...uploadedUrls]

      for (const url of existingImageUrls) {
        if (!removedImageUrls.includes(url)) {
          allUrls.push(url)
        }
      }

      return allUrls.length > 0 ? allUrls : null
    },
    [existingImageUrls, removedImageUrls]
  )

  // 送信処理
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      submitStart()

      // createモード: 楽観的更新を使用
      if (mode === 'create') {
        // 1. 下書きをクリア
        clearDraft()

        // 2. 既存のリダイレクトタイマーをクリア（念のため）
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current)
          redirectTimerRef.current = null
        }

        // 3. 楽観的更新でmutationを開始
        createMutation.mutate({
          content,
          images,
          existingImageUrls,
          removedImageUrls,
          isShared,
        })

        // 4. 成功アニメーションを表示
        submitSuccess()

        // 5. アニメーション表示後にリダイレクト（800msで以前と同等の体感時間）
        // エラー時はonErrorコールバックでタイマーがクリアされる
        redirectTimerRef.current = setTimeout(() => {
          redirectTimerRef.current = null
          reset()
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/timeline')
          }
        }, 800)
        return
      }

      // editモード: 従来通りの処理
      try {
        if (!initialEntry) {
          submitError('編集対象のエントリーが見つかりません')
          return
        }

        const uploadedUrls = await uploadImages(images)
        if (uploadedUrls === null) {
          return
        }

        const imageUrls = buildImageUrls(uploadedUrls)

        const result = await updateEntry({
          id: initialEntry.id,
          content,
          imageUrls,
          isShared,
        })

        if (result.serverError) {
          submitError(result.serverError)
          return
        }
        if (!result.data) {
          submitError('エラーが発生しました')
          return
        }

        submitSuccess()

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.entries.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.social.all }),
        ])

        setTimeout(() => {
          onSuccess ? onSuccess() : router.push('/timeline')
        }, 300)
      } catch (err) {
        submitError(err instanceof Error ? err.message : '投稿に失敗しました')
      }
    },
    [
      mode,
      initialEntry,
      content,
      images,
      existingImageUrls,
      removedImageUrls,
      isShared,
      submitStart,
      submitSuccess,
      submitError,
      reset,
      createMutation,
      uploadImages,
      buildImageUrls,
      queryClient,
      router,
      onSuccess,
    ]
  )

  // 外部からフォーム送信を呼び出すためのメソッド
  const submitForm = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }, [])

  return {
    formRef,
    handleSubmit,
    submitForm,
  }
}
