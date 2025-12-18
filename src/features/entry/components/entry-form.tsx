'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Entry, CompressedImage } from '@/features/entry/types'
import { ImageAttachment } from './image-attachment'
import { createEntry, updateEntry } from '@/features/entry/api/service'
import { uploadImage } from '@/features/entry/api/image-service'
import { saveDraft, loadDraft, clearDraft } from '@/features/entry/api/draft-storage'
import { Button } from '@/components/ui/button'

interface EntryFormProps {
  mode: 'create' | 'edit'
  initialEntry?: Entry
  userId: string
  onSuccess?: () => void
}

export function EntryForm({ mode, initialEntry, userId, onSuccess }: EntryFormProps) {
  const [content, setContent] = useState(initialEntry?.content || '')
  const [image, setImage] = useState<CompressedImage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // 下書き復元（新規作成時のみ）
  useEffect(() => {
    if (mode === 'create') {
      const draft = loadDraft()
      if (draft) {
        setContent(draft.content)
        // TODO: 画像プレビューの復元
      }
    }
  }, [mode])

  // 下書き自動保存（300msデバウンス）
  useEffect(() => {
    if (mode !== 'create') return

    const timer = setTimeout(() => {
      saveDraft({
        content,
        imagePreview: image?.previewUrl || null,
        savedAt: new Date().toISOString()
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
    setError(null)
    setIsSubmitting(true)

    try {
      // 画像アップロード
      let imageUrl: string | null = initialEntry?.image_url || null
      if (image) {
        const uploadResult = await uploadImage(image.file, userId)
        if (!uploadResult.ok) {
          setError(uploadResult.error.message)
          setIsSubmitting(false)
          return
        }
        imageUrl = uploadResult.value
      }

      // エントリ作成/更新
      const result = mode === 'create'
        ? await createEntry({ content, imageUrl })
        : await updateEntry(initialEntry!.id, { content, imageUrl })

      if (!result.ok) {
        setError(result.error.message)
        setIsSubmitting(false)
        return
      }

      // 下書き削除
      if (mode === 'create') {
        clearDraft()
      }

      // 成功
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen p-4 flex flex-col">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="今日はどんな日？ 絵文字1つでもOK"
        className="flex-1 w-full resize-none border-none outline-none text-lg p-4 min-h-32"
        disabled={isSubmitting}
      />

      <div className="mt-4">
        <ImageAttachment
          image={image}
          onImageSelect={setImage}
          onImageRemove={() => setImage(null)}
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || content.trim().length === 0}
        className="mt-4 w-full"
      >
        {isSubmitting ? '送信中...' : mode === 'create' ? '記録する' : '更新する'}
      </Button>
    </form>
  )
}
