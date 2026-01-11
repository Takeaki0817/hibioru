'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import type { Entry, CompressedImage } from '@/features/entry/types'
import { createEntry, updateEntry } from '@/features/entry/api/actions'
import { uploadImage } from '@/features/entry/api/image-service'
import { clearDraft } from '@/features/entry/api/draft-storage'
import { queryKeys } from '@/lib/constants/query-keys'
import { useEntryFormStore } from '../stores/entry-form-store'

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

  // 画像アップロード処理
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

  // 画像URL配列の構築（新規 + 既存で削除されていないもの）
  const buildImageUrls = useCallback(
    (uploadedUrls: string[]): string[] | null => {
      const allUrls = [...uploadedUrls]

      // 既存画像を維持（削除予定でないもの）
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

      try {
        // 新規画像をアップロード
        const uploadedUrls = await uploadImages(images)
        if (uploadedUrls === null) {
          // エラーはuploadImages内で設定済み
          return
        }

        // 画像URL配列を構築
        const imageUrls = buildImageUrls(uploadedUrls)

        // エントリ作成/更新
        const result =
          mode === 'create'
            ? await createEntry({ content, imageUrls, isShared })
            : await updateEntry({
                id: initialEntry!.id,
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

        // 下書き削除（新規作成時のみ）
        if (mode === 'create') {
          clearDraft()
        }

        // 成功アニメーション表示
        submitSuccess()

        // キャッシュ無効化（共有状態の変更を反映）
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.entries.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.social.all }),
        ])

        // 少し待ってから遷移
        setTimeout(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/timeline')
          }
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
      isShared,
      submitStart,
      submitSuccess,
      submitError,
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
