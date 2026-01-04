'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { cva } from 'class-variance-authority'
import { Trash2, Share } from 'lucide-react'
import type { Entry } from '@/features/entry/types'
import { ImageAttachment } from './image-attachment'
import { SuccessOverlay } from './success-overlay'
import { ImagePreviewGrid } from './image-preview-grid'
import { createEntry, updateEntry, deleteEntry } from '@/features/entry/api/service'
import { uploadImage } from '@/features/entry/api/image-service'
import { saveDraft, loadDraft, clearDraft } from '@/features/entry/api/draft-storage'
import { MotionButton } from '@/components/ui/motion-button'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/constants/query-keys'
import { useEntryFormStore, selectCanSubmit, selectCanAddImage } from '../stores/entry-form-store'

// CVAバリアント定義 - フォームコンテナ
const formContainerVariants = cva(
  'relative flex-1 rounded-xl border-2 transition-all duration-200',
  {
    variants: {
      state: {
        default: 'border-border',
        focused: 'border-primary-300 shadow-[0_0_0_4px] shadow-primary-100 dark:shadow-primary-900/30',
        success: 'border-primary-400',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
)

// フォーム状態を決定するヘルパー関数
function getFormState(isFocused: boolean, isSuccess: boolean): 'default' | 'focused' | 'success' {
  if (isSuccess) return 'success'
  if (isFocused) return 'focused'
  return 'default'
}

// 外部から呼び出せるメソッド
export interface EntryFormHandle {
  submit: () => void
}

interface EntryFormProps {
  mode: 'create' | 'edit'
  initialEntry?: Entry
  userId: string
  onSuccess?: () => void
  hideSubmitButton?: boolean
}

// フォームのアニメーション
const formVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
}

export const EntryForm = forwardRef<EntryFormHandle, EntryFormProps>(function EntryForm(
  { mode, initialEntry, userId, onSuccess, hideSubmitButton },
  ref
) {
  // Zustandストアから状態とアクションを取得
  const content = useEntryFormStore((s) => s.content)
  const images = useEntryFormStore((s) => s.images)
  const existingImageUrls = useEntryFormStore((s) => s.existingImageUrls)
  const removedImageUrls = useEntryFormStore((s) => s.removedImageUrls)
  const isShared = useEntryFormStore((s) => s.isShared)
  const isSubmitting = useEntryFormStore((s) => s.isSubmitting)
  const isDeleting = useEntryFormStore((s) => s.isDeleting)
  const showDeleteConfirm = useEntryFormStore((s) => s.showDeleteConfirm)
  const isSuccess = useEntryFormStore((s) => s.isSuccess)
  const isFocused = useEntryFormStore((s) => s.isFocused)
  const error = useEntryFormStore((s) => s.error)
  const canSubmit = useEntryFormStore(selectCanSubmit)
  const canAddImage = useEntryFormStore(selectCanAddImage)

  const setContent = useEntryFormStore((s) => s.setContent)
  const setIsShared = useEntryFormStore((s) => s.setIsShared)
  const addImage = useEntryFormStore((s) => s.addImage)
  const removeImage = useEntryFormStore((s) => s.removeImage)
  const toggleExistingImageRemoval = useEntryFormStore((s) => s.toggleExistingImageRemoval)
  const setShowDeleteConfirm = useEntryFormStore((s) => s.setShowDeleteConfirm)
  const setFocused = useEntryFormStore((s) => s.setFocused)
  const submitStart = useEntryFormStore((s) => s.submitStart)
  const submitSuccess = useEntryFormStore((s) => s.submitSuccess)
  const submitError = useEntryFormStore((s) => s.submitError)
  const deleteStart = useEntryFormStore((s) => s.deleteStart)
  const deleteError = useEntryFormStore((s) => s.deleteError)
  const initialize = useEntryFormStore((s) => s.initialize)
  const reset = useEntryFormStore((s) => s.reset)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // 外部から送信を呼び出せるようにする
  useImperativeHandle(ref, () => ({
    submit: () => {
      if (canSubmit && formRef.current) {
        formRef.current.requestSubmit()
      }
    },
  }))

  // ストア初期化（マウント時）
  useEffect(() => {
    if (mode === 'create') {
      // 下書き復元
      const draft = loadDraft()
      initialize(draft?.content || '', null, false)
    } else {
      // 編集モード：既存コンテンツ、画像URL、共有状態で初期化
      initialize(initialEntry?.content || '', initialEntry?.image_urls || null, initialEntry?.is_shared ?? false)
    }

    // アンマウント時にリセット
    return () => {
      reset()
    }
  }, [mode, initialEntry?.content, initialEntry?.image_urls, initialEntry?.is_shared, initialize, reset])

  // 下書き自動保存（300msデバウンス、新規作成時のみ）
  useEffect(() => {
    if (mode !== 'create') return

    const timer = setTimeout(() => {
      saveDraft({
        content,
        imagePreview: images[0]?.previewUrl || null,
        savedAt: new Date().toISOString(),
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [content, images, mode])

  // マウント時にtextareaにフォーカス
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // キーボードショートカット（Command/Ctrl + Enter で送信）
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canSubmit) {
        formRef.current?.requestSubmit()
      }
    }
  }, [canSubmit])

  // テキストエリアのイベントハンドラー（useCallbackで安定化）
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value),
    [setContent]
  )
  const handleFocus = useCallback(() => setFocused(true), [setFocused])
  const handleBlur = useCallback(() => setFocused(false), [setFocused])
  const handleShowDeleteConfirm = useCallback(() => setShowDeleteConfirm(true), [setShowDeleteConfirm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    submitStart()

    try {
      // 画像URL配列を構築
      const imageUrls: string[] = []

      // 新規画像をアップロード
      for (const img of images) {
        const uploadResult = await uploadImage(img.file, userId)
        if (!uploadResult.ok) {
          submitError(uploadResult.error.message)
          return
        }
        imageUrls.push(uploadResult.value)
      }

      // 既存画像を維持（削除予定でないもの）
      for (const url of existingImageUrls) {
        if (!removedImageUrls.includes(url)) {
          imageUrls.push(url)
        }
      }

      // エントリ作成/更新
      const result =
        mode === 'create'
          ? await createEntry({ content, imageUrls: imageUrls.length > 0 ? imageUrls : null, isShared })
          : await updateEntry(initialEntry!.id, { content, imageUrls: imageUrls.length > 0 ? imageUrls : null, isShared })

      if (!result.ok) {
        submitError(result.error.message)
        return
      }

      // 下書き削除
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
  }

  // 削除処理
  const handleDelete = async () => {
    if (!initialEntry) return

    deleteStart()

    try {
      const result = await deleteEntry(initialEntry.id)

      if (!result.ok) {
        deleteError(result.error.message)
        return
      }

      // タイムラインに戻る
      router.push('/timeline')
    } catch (err) {
      deleteError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <motion.form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex-1 p-4 flex flex-col bg-background overflow-auto"
      variants={formVariants}
      initial="initial"
      animate="animate"
    >
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium text-muted-foreground flex items-center gap-2">
          <span>💭</span>
          <span>今、何を考えてる？</span>
        </h1>
        <label htmlFor="share-toggle" className="flex items-center gap-2 cursor-pointer select-none">
          <Share className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">フォロワーに共有</span>
          <Switch
            id="share-toggle"
            checked={isShared}
            onCheckedChange={setIsShared}
            disabled={isSubmitting || isSuccess}
          />
        </label>
      </div>

      {/* テキストエリア */}
      <div className={formContainerVariants({ state: getFormState(isFocused, isSuccess) })}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="残しておきたいこと、なんでも"
          aria-label="記録内容"
          aria-busy={isSubmitting}
          className={cn(
            'w-full min-h-full resize-none border-none outline-none text-base p-4 rounded-xl',
            'bg-transparent placeholder:text-muted-foreground/60',
            'leading-relaxed overflow-y-auto'
          )}
          disabled={isSubmitting || isSuccess}
        />

        {/* 成功オーバーレイ */}
        <AnimatePresence>
          {isSuccess && <SuccessOverlay />}
        </AnimatePresence>
      </div>

      {/* 画像プレビュー行 */}
      <ImagePreviewGrid
        newImages={images}
        existingImageUrls={existingImageUrls}
        removedImageUrls={removedImageUrls}
        onRemoveNewImage={removeImage}
        onToggleExistingImageRemoval={toggleExistingImageRemoval}
        disabled={isSubmitting || isSuccess}
      />

      {/* 画像添付 & 削除ボタン */}
      <div className="mt-4 flex items-center justify-between">
        <ImageAttachment
          onImageSelect={addImage}
          disabled={isSubmitting || isSuccess || !canAddImage}
        />

        {/* 削除ボタン（編集モードのみ） */}
        {mode === 'edit' && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleShowDeleteConfirm}
            disabled={isSubmitting || isDeleting || isSuccess}
            aria-label="この記録を削除"
            className="w-20 h-20 rounded-lg bg-accent/60 hover:bg-accent/70"
          >
            <Trash2 size={24} className="text-red-500" />
          </Button>
        )}
      </div>

      {/* エラー表示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 送信ボタン（hideSubmitButtonがfalseの場合のみ表示） */}
      {!hideSubmitButton && (
        <MotionButton
          type="submit"
          variant="sage"
          size="xl"
          disabled={!canSubmit}
          className="mt-4 w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              送信中...
            </span>
          ) : isSuccess ? (
            '完了！'
          ) : mode === 'create' ? (
            '記録する →'
          ) : (
            '更新する'
          )}
        </MotionButton>
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => !isDeleting && setShowDeleteConfirm(open)}
        title="記録を削除しますか？"
        description="この操作は取り消せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </motion.form>
  )
})
