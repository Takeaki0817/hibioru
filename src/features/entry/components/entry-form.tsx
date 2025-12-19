'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { Entry } from '@/features/entry/types'
import { ImageAttachment } from './image-attachment'
import { createEntry, updateEntry, deleteEntry } from '@/features/entry/api/service'
import { uploadImage } from '@/features/entry/api/image-service'
import { saveDraft, loadDraft, clearDraft } from '@/features/entry/api/draft-storage'
import { MotionButton } from '@/components/ui/motion-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEntryFormStore, selectCanSubmit } from '../stores/entry-form-store'

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
  const image = useEntryFormStore((s) => s.image)
  const isSubmitting = useEntryFormStore((s) => s.isSubmitting)
  const isDeleting = useEntryFormStore((s) => s.isDeleting)
  const showDeleteConfirm = useEntryFormStore((s) => s.showDeleteConfirm)
  const isSuccess = useEntryFormStore((s) => s.isSuccess)
  const isFocused = useEntryFormStore((s) => s.isFocused)
  const error = useEntryFormStore((s) => s.error)
  const canSubmit = useEntryFormStore(selectCanSubmit)

  const setContent = useEntryFormStore((s) => s.setContent)
  const setImage = useEntryFormStore((s) => s.setImage)
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
      // 編集モード：既存コンテンツで初期化
      initialize(initialEntry?.content || '')
    }

    // アンマウント時にリセット
    return () => {
      reset()
    }
  }, [mode, initialEntry?.content, initialize, reset])

  // 下書き自動保存（300msデバウンス、新規作成時のみ）
  useEffect(() => {
    if (mode !== 'create') return

    const timer = setTimeout(() => {
      saveDraft({
        content,
        imagePreview: image?.previewUrl || null,
        savedAt: new Date().toISOString(),
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [content, image, mode])

  // textareaのauto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    submitStart()

    try {
      // 画像アップロード
      let imageUrl: string | null = initialEntry?.image_url || null
      if (image) {
        const uploadResult = await uploadImage(image.file, userId)
        if (!uploadResult.ok) {
          submitError(uploadResult.error.message)
          return
        }
        imageUrl = uploadResult.value
      }

      // エントリ作成/更新
      const result =
        mode === 'create'
          ? await createEntry({ content, imageUrl })
          : await updateEntry(initialEntry!.id, { content, imageUrl })

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
          router.push('/')
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
          placeholder="絵文字1つでもOK 🌟"
          className={cn(
            'w-full resize-none border-none outline-none text-base p-4 min-h-32 rounded-xl',
            'bg-transparent placeholder:text-muted-foreground/60',
            'leading-relaxed'
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

      {/* 画像添付 & 削除ボタン */}
      <div className="mt-4 flex items-center justify-between">
        <ImageAttachment
          image={image}
          onImageSelect={setImage}
          onImageRemove={() => setImage(null)}
          disabled={isSubmitting || isSuccess}
        />

        {/* 削除ボタン（編集モードのみ） */}
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting || isDeleting || isSuccess}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm',
              'text-muted-foreground hover:text-destructive',
              'hover:bg-destructive/10 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 className="w-4 h-4" />
            <span>削除</span>
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
