'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, ImageOff, X } from 'lucide-react'
import type { Entry } from '@/features/entry/types'
import { ImageAttachment } from './image-attachment'
import { createEntry, updateEntry, deleteEntry } from '@/features/entry/api/service'
import { uploadImage } from '@/features/entry/api/image-service'
import { saveDraft, loadDraft, clearDraft } from '@/features/entry/api/draft-storage'
import { MotionButton } from '@/components/ui/motion-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEntryFormStore, selectCanSubmit, selectCanAddImage } from '../stores/entry-form-store'

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

// 成功アニメーション
const successVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
  },
  exit: { scale: 0, opacity: 0 },
}

// チェックマークのパスアニメーション
const checkmarkVariants = {
  initial: { pathLength: 0 },
  animate: {
    pathLength: 1,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
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
  const isSubmitting = useEntryFormStore((s) => s.isSubmitting)
  const isDeleting = useEntryFormStore((s) => s.isDeleting)
  const showDeleteConfirm = useEntryFormStore((s) => s.showDeleteConfirm)
  const isSuccess = useEntryFormStore((s) => s.isSuccess)
  const isFocused = useEntryFormStore((s) => s.isFocused)
  const error = useEntryFormStore((s) => s.error)
  const canSubmit = useEntryFormStore(selectCanSubmit)
  const canAddImage = useEntryFormStore(selectCanAddImage)

  const setContent = useEntryFormStore((s) => s.setContent)
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
      initialize(draft?.content || '')
    } else {
      // 編集モード：既存コンテンツと画像URLで初期化
      initialize(initialEntry?.content || '', initialEntry?.image_urls || null)
    }

    // アンマウント時にリセット
    return () => {
      reset()
    }
  }, [mode, initialEntry?.content, initialEntry?.image_urls, initialize, reset])

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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canSubmit) {
        formRef.current?.requestSubmit()
      }
    }
  }

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
          ? await createEntry({ content, imageUrls: imageUrls.length > 0 ? imageUrls : null })
          : await updateEntry(initialEntry!.id, { content, imageUrls: imageUrls.length > 0 ? imageUrls : null })

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

      // 少し待ってから遷移
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          // Server Action後のセッション同期のためrefreshを呼び出し
          router.refresh()
          router.push('/timeline')
        }
      }, 800)
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
      <div className="mb-4">
        <h1 className="text-lg font-medium text-muted-foreground flex items-center gap-2">
          <span>💭</span>
          <span>今日はどんな日？</span>
        </h1>
      </div>

      {/* テキストエリア */}
      <div
        className={cn(
          'relative flex-1 rounded-xl border-2 transition-all duration-200',
          isFocused
            ? 'border-primary-300 shadow-[0_0_0_4px] shadow-primary-100 dark:shadow-primary-900/30'
            : 'border-border',
          isSuccess && 'border-primary-400'
        )}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="絵文字1つでもOK 🌟"
          className={cn(
            'w-full min-h-full resize-none border-none outline-none text-base p-4 rounded-xl',
            'bg-transparent placeholder:text-muted-foreground/60',
            'leading-relaxed overflow-y-auto'
          )}
          disabled={isSubmitting || isSuccess}
        />

        {/* 成功オーバーレイ */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-xl"
              variants={successVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div className="w-16 h-16 rounded-full bg-primary-400 flex items-center justify-center">
                  <motion.svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      variants={checkmarkVariants}
                      initial="initial"
                      animate="animate"
                    />
                  </motion.svg>
                </motion.div>
                <motion.p
                  className="text-primary-500 font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  記録しました！
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 画像プレビュー行（画像がある場合のみ表示） */}
      {(images.length > 0 || existingImageUrls.length > 0) && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {/* 新規追加した画像 */}
          {images.map((img, index) => (
            <div key={`new-${index}`} className="relative w-20 h-20">
              <img
                src={img.previewUrl}
                alt={`プレビュー ${index + 1}`}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={isSubmitting || isSuccess}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* 既存画像の表示（編集モード） */}
          {existingImageUrls.map((url, index) => {
            const isRemoved = removedImageUrls.includes(url)
            return (
              <div key={`existing-${index}`} className="relative w-20 h-20">
                <img
                  src={url}
                  alt={`既存画像 ${index + 1}`}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                {isRemoved ? (
                  // 削除予定のオーバーレイ
                  <button
                    type="button"
                    onClick={() => toggleExistingImageRemoval(url)}
                    disabled={isSubmitting || isSuccess}
                    className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center disabled:cursor-not-allowed"
                  >
                    <ImageOff size={24} className="text-accent-400" />
                  </button>
                ) : (
                  // 削除ボタン
                  <button
                    type="button"
                    onClick={() => toggleExistingImageRemoval(url)}
                    disabled={isSubmitting || isSuccess}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 画像添付 & 削除ボタン */}
      <div className="mt-4 flex items-center justify-between">
        <ImageAttachment
          onImageSelect={addImage}
          disabled={isSubmitting || isSuccess || !canAddImage}
        />

        {/* 削除ボタン（編集モードのみ） */}
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting || isDeleting || isSuccess}
            className={cn(
              'flex items-center justify-center w-20 h-20 rounded-lg transition-colors',
              'bg-accent/60 hover:bg-accent/70',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 size={24} className="text-red-500" />
          </button>
        )}
      </div>

      {/* エラー表示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
          >
            {error}
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
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-xl p-6 max-w-sm w-full shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">記録を削除しますか？</h3>
              <p className="text-sm text-muted-foreground mb-6">
                この操作は取り消せません。
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      削除中...
                    </span>
                  ) : (
                    '削除する'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  )
})
