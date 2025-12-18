'use client'

import { useState, useRef } from 'react'
import type { CompressedImage } from '@/features/entry/types'
import { compressImage } from '@/features/entry/api/image-service'

interface ImageAttachmentProps {
  image: CompressedImage | null
  onImageSelect: (image: CompressedImage) => void
  onImageRemove: () => void
  disabled?: boolean
}

export function ImageAttachment({
  image,
  onImageSelect,
  onImageRemove,
  disabled = false
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

  const handleRemove = () => {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl)
    }
    onImageRemove()
  }

  return (
    <div className="space-y-2">
      {!image && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || isCompressing}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg cursor-pointer disabled:opacity-50"
          >
            {isCompressing ? '圧縮中...' : '画像を添付'}
          </label>
          {isCompressing && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      )}

      {image && (
        <div className="relative">
          <img
            src={image.previewUrl}
            alt="プレビュー"
            className="max-w-full rounded-lg"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
          >
            削除
          </button>
          <p className="text-sm text-gray-600 mt-2">
            元サイズ: {(image.originalSize / 1024).toFixed(1)}KB →{' '}
            圧縮後: {(image.compressedSize / 1024).toFixed(1)}KB
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
