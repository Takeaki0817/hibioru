'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import { cva } from 'class-variance-authority'
import { MessageCircleMore, Trash2, Users } from 'lucide-react'
import type { Entry } from '@/features/entry/types'
import { ImageAttachment } from './image-attachment'
import { SuccessOverlay } from './success-overlay'
import { ImagePreviewGrid } from './image-preview-grid'
import { saveDraft, loadDraft } from '@/features/entry/api/draft-storage'
import { MotionButton } from '@/components/ui/motion-button'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useEntryFormStore, selectCanSubmit, selectCanAddImage } from '../stores/entry-form-store'
import { useEntrySubmit } from '../hooks/use-entry-submit'
import { useEntryDelete } from '../hooks/use-entry-delete'

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
  // Zustandストアから状態とアクションを取得（useShallowで依存配列チェック削減）
  // Form state group
  const formState = useEntryFormStore(
    useShallow((s) => ({
      content: s.content,
      images: s.images,
      existingImageUrls: s.existingImageUrls,
      removedImageUrls: s.removedImageUrls,
      isShared: s.isShared,
    }))
  )

  // UI state group
  const uiState = useEntryFormStore(
    useShallow((s) => ({
      isSubmitting: s.isSubmitting,
      isSuccess: s.isSuccess,
      isFocused: s.isFocused,
      error: s.error,
    }))
  )

  // Actions group
  const actions = useEntryFormStore(
    useShallow((s) => ({
      setContent: s.setContent,
      setIsShared: s.setIsShared,
      addImage: s.addImage,
      removeImage: s.removeImage,
      toggleExistingImageRemoval: s.toggleExistingImageRemoval,
      setFocused: s.setFocused,
      initialize: s.initialize,
      reset: s.reset,
    }))
  )

  // Keep selector-based values separate
  const canSubmit = useEntryFormStore(selectCanSubmit)
  const canAddImage = useEntryFormStore(selectCanAddImage)

  // 送信・削除フック
  const { formRef, handleSubmit, submitForm } = useEntrySubmit({
    mode,
    initialEntry,
    userId,
    onSuccess,
  })

  const {
    showDeleteConfirm,
    isDeleting,
    handleShowDeleteConfirm,
    handleCloseDeleteConfirm,
    handleDelete,
  } = useEntryDelete({ initialEntry })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 外部から送信を呼び出せるようにする
  useImperativeHandle(ref, () => ({
    submit: () => {
      if (canSubmit) {
        submitForm()
      }
    },
  }))

  // ストア初期化（マウント時）
  useEffect(() => {
    if (mode === 'create') {
      // 下書き復元
      const draft = loadDraft()
      actions.initialize(draft?.content || '', null, false)
    } else {
      // 編集モード：既存コンテンツ、画像URL、共有状態で初期化
      actions.initialize(initialEntry?.content || '', initialEntry?.image_urls || null, initialEntry?.is_shared ?? false)
    }

    // アンマウント時にリセット
    return () => {
      actions.reset()
    }
  }, [mode, initialEntry?.content, initialEntry?.image_urls, initialEntry?.is_shared, actions])

  // 下書き自動保存（300msデバウンス、新規作成時のみ）
  useEffect(() => {
    if (mode !== 'create') return

    const timer = setTimeout(() => {
      saveDraft({
        content: formState.content,
        imagePreview: formState.images[0]?.previewUrl || null,
        savedAt: new Date().toISOString(),
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [formState.content, formState.images, mode])

  // マウント時にtextareaにフォーカス
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // キーボードショートカット（Command/Ctrl + Enter で送信）
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canSubmit) {
        submitForm()
      }
    }
  }, [canSubmit, submitForm])

  // テキストエリアのイベントハンドラー（useCallbackで安定化）
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => actions.setContent(e.target.value),
    [actions]
  )
  const handleFocus = useCallback(() => actions.setFocused(true), [actions])
  const handleBlur = useCallback(() => actions.setFocused(false), [actions])

  // 操作無効化フラグ
  const isDisabled = uiState.isSubmitting || uiState.isSuccess

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
        <h1 className="text-lg font-medium text-muted-foreground flex items-center gap-1.5">
          <MessageCircleMore className="size-6 text-primary" />
          <span>今、何を考えてる？</span>
        </h1>
        <label htmlFor="share-toggle" className="flex items-center gap-2 cursor-pointer select-none">
          <Users className="size-5 text-muted-foreground" />
          <Switch
            id="share-toggle"
            checked={formState.isShared}
            onCheckedChange={actions.setIsShared}
            disabled={isDisabled}
          />
        </label>
      </div>

      {/* テキストエリア */}
      <div className={formContainerVariants({ state: getFormState(uiState.isFocused, uiState.isSuccess) })}>
        <textarea
          ref={textareaRef}
          value={formState.content}
          onChange={handleContentChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="残しておきたいこと、なんでも"
          aria-label="記録内容"
          aria-busy={uiState.isSubmitting}
          className={cn(
            'w-full min-h-full resize-none border-none outline-none text-base p-4 rounded-xl',
            'bg-transparent placeholder:text-muted-foreground/60',
            'leading-relaxed overflow-y-auto'
          )}
          disabled={isDisabled}
        />

        {/* 成功オーバーレイ */}
        <AnimatePresence>
          {uiState.isSuccess && <SuccessOverlay />}
        </AnimatePresence>
      </div>

      {/* 画像プレビュー行 */}
      <ImagePreviewGrid
        newImages={formState.images}
        existingImageUrls={formState.existingImageUrls}
        removedImageUrls={formState.removedImageUrls}
        onRemoveNewImage={actions.removeImage}
        onToggleExistingImageRemoval={actions.toggleExistingImageRemoval}
        disabled={isDisabled}
      />

      {/* 画像添付 & 削除ボタン */}
      <div className="mt-4 flex items-center justify-between">
        <ImageAttachment
          onImageSelect={actions.addImage}
          disabled={isDisabled || !canAddImage}
        />

        {/* 削除ボタン（編集モードのみ） */}
        {mode === 'edit' && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleShowDeleteConfirm}
            disabled={isDisabled || isDeleting}
            aria-label="この記録を削除"
            className="w-20 h-20 rounded-lg bg-accent/60 hover:bg-accent/70"
          >
            <Trash2 size={24} className="text-red-500" />
          </Button>
        )}
      </div>

      {/* エラー表示 */}
      <AnimatePresence>
        {uiState.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive" className="mt-4" data-testid="daily-limit-error-message">
              <AlertDescription>{uiState.error}</AlertDescription>
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
          {uiState.isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              送信中...
            </span>
          ) : uiState.isSuccess ? (
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
        onOpenChange={handleCloseDeleteConfirm}
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
