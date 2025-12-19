'use client'

import { useState, useRef } from 'react'
import { ImagePlus } from 'lucide-react'
import type { CompressedImage } from '@/features/entry/types'
import { compressImage } from '@/features/entry/api/image-service'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ImageAttachmentProps {
  onImageSelect: (image: CompressedImage) => void
  disabled?: boolean
}

export function ImageAttachment({
  onImageSelect,
  disabled = false,
}: ImageAttachmentProps) {
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIsCompressing(true)
    setProgress(0)

    const result = await compressImage(file, (p) => setProgress(p))

    if (result.ok) {
      onImageSelect(result.value)
    } else {
      setError(result.error.message)
    }

    setIsCompressing(false)
    setProgress(0)

    // 同じファイルを再選択できるようにリセット
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const isDisabled = disabled || isCompressing

  return (
    <div className="space-y-2">
      {/* 画像添付ボタン */}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isDisabled}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className={cn(
            'flex items-center justify-center w-20 h-20 rounded-lg transition-colors',
            'bg-primary/10 hover:bg-primary/20',
            isDisabled && 'opacity-50 cursor-not-allowed',
            !isDisabled && 'cursor-pointer'
          )}
        >
          {isCompressing ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-12">
                <Progress value={progress} className="h-1" />
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          ) : (
            <ImagePlus size={24} className="text-primary" />
          )}
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
