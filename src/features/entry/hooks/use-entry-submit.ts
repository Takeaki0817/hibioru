'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/shallow'
import type { Entry, CompressedImage } from '@/features/entry/types'
import { updateEntry } from '@/features/entry/api/actions'
import { uploadImage, deleteImage } from '@/features/entry/api/image-service'
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

  // Zustandストアから必要な状態とアクションを取得（useShallowでグルーピング）
  const formData = useEntryFormStore(
    useShallow((s) => ({
      content: s.content,
      images: s.images,
      existingImageUrls: s.existingImageUrls,
      removedImageUrls: s.removedImageUrls,
      isShared: s.isShared,
    }))
  )

  const actions = useEntryFormStore(
    useShallow((s) => ({
      submitStart: s.submitStart,
      submitSuccess: s.submitSuccess,
      submitError: s.submitError,
      reset: s.reset,
    }))
  )

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
      actions.submitError('投稿に失敗しました')
    },
  })

  // 画像アップロード処理（editモード用）- 並列アップロード with cleanup
  const uploadImages = useCallback(
    async (imagesToUpload: CompressedImage[]): Promise<string[] | null> => {
      const settledResults = await Promise.allSettled(
        imagesToUpload.map((img) => uploadImage(img.file, userId))
      )

      // Collect successful uploads and check for failures
      const successfulUrls: string[] = []
      let hasFailure = false
      let failureMessage = 'アップロードに失敗しました'

      for (const settled of settledResults) {
        if (settled.status === 'rejected') {
          hasFailure = true
          failureMessage = settled.reason instanceof Error
            ? settled.reason.message
            : 'アップロードに失敗しました'
        } else if (!settled.value.ok) {
          hasFailure = true
          failureMessage = settled.value.error.message
        } else {
          successfulUrls.push(settled.value.value)
        }
      }

      // If any upload failed, clean up successfully uploaded images
      if (hasFailure) {
        await Promise.allSettled(successfulUrls.map((url) => deleteImage(url)))
        actions.submitError(failureMessage)
        return null
      }

      // All succeeded - extract URLs with explicit type narrowing
      return settledResults.map((settled) => {
        if (settled.status === 'rejected') {
          throw new Error('Unexpected rejected state')
        }
        if (!settled.value.ok) {
          throw new Error('Unexpected error state')
        }
        return settled.value.value
      })
    },
    [userId, actions]
  )

  // 画像URL配列の構築（editモード用）
  const buildImageUrls = useCallback(
    (uploadedUrls: string[]): string[] | null => {
      const allUrls = [...uploadedUrls]

      for (const url of formData.existingImageUrls) {
        if (!formData.removedImageUrls.has(url)) {
          allUrls.push(url)
        }
      }

      return allUrls.length > 0 ? allUrls : null
    },
    [formData]
  )

  // 送信処理
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      actions.submitStart()

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
          content: formData.content,
          images: formData.images,
          existingImageUrls: formData.existingImageUrls,
          removedImageUrls: formData.removedImageUrls,
          isShared: formData.isShared,
        })

        // 4. 成功アニメーションを表示
        actions.submitSuccess()

        // 5. アニメーション表示後にリダイレクト（800msで以前と同等の体感時間）
        // エラー時はonErrorコールバックでタイマーがクリアされる
        redirectTimerRef.current = setTimeout(() => {
          redirectTimerRef.current = null
          actions.reset()
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
          actions.submitError('編集対象のエントリーが見つかりません')
          return
        }

        const uploadedUrls = await uploadImages(formData.images)
        if (uploadedUrls === null) {
          return
        }

        const imageUrls = buildImageUrls(uploadedUrls)

        const result = await updateEntry({
          id: initialEntry.id,
          content: formData.content,
          imageUrls,
          isShared: formData.isShared,
        })

        if (result.serverError) {
          actions.submitError(result.serverError)
          return
        }
        if (!result.data) {
          actions.submitError('エラーが発生しました')
          return
        }

        actions.submitSuccess()

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.entries.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.social.all }),
        ])

        setTimeout(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/timeline')
          }
        }, 300)
      } catch (err) {
        actions.submitError(err instanceof Error ? err.message : '投稿に失敗しました')
      }
    },
    [
      mode,
      initialEntry,
      formData,
      actions,
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
