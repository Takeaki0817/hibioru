'use client'

import Image from 'next/image'
import { ImageOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageData {
  file: File
  previewUrl: string
}

interface ImagePreviewGridProps {
  /** 新規追加した画像 */
  newImages: ImageData[]
  /** 既存の画像URL */
  existingImageUrls: string[]
  /** 削除予定の画像URL */
  removedImageUrls: string[]
  /** 新規画像を削除 */
  onRemoveNewImage: (index: number) => void
  /** 既存画像の削除/復元をトグル */
  onToggleExistingImageRemoval: (url: string) => void
  /** 操作無効化 */
  disabled?: boolean
}

/**
 * 画像プレビューグリッド
 * 新規追加画像と既存画像の表示・削除操作を提供
 */
export function ImagePreviewGrid({
  newImages,
  existingImageUrls,
  removedImageUrls,
  onRemoveNewImage,
  onToggleExistingImageRemoval,
  disabled = false,
}: ImagePreviewGridProps) {
  // 画像がない場合は何も表示しない
  if (newImages.length === 0 && existingImageUrls.length === 0) {
    return null
  }

  return (
    <div className="mt-4 flex gap-2 flex-wrap">
      {/* 新規追加した画像 */}
      {newImages.map((img, index) => (
        <div key={`new-${index}`} className="relative w-20 h-20">
          <img
            src={img.previewUrl}
            alt={`プレビュー ${index + 1}`}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={() => onRemoveNewImage(index)}
            disabled={disabled}
            aria-label={`画像${index + 1}を削除`}
            className="absolute -top-2 -right-2 !size-6 rounded-full shadow-md"
          >
            <X size={14} />
          </Button>
        </div>
      ))}

      {/* 既存画像の表示（編集モード） */}
      {existingImageUrls.map((url, index) => {
        const isRemoved = removedImageUrls.includes(url)
        return (
          <div key={`existing-${index}`} className="relative w-20 h-20">
            <Image
              src={url}
              alt={`既存画像 ${index + 1}`}
              width={80}
              height={80}
              className="w-20 h-20 rounded-lg object-cover"
            />
            {isRemoved ? (
              // 削除予定のオーバーレイ
              <Button
                type="button"
                variant="ghost"
                onClick={() => onToggleExistingImageRemoval(url)}
                disabled={disabled}
                aria-label={`画像${index + 1}の削除を取り消す`}
                className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center disabled:cursor-not-allowed h-auto p-0"
              >
                <ImageOff size={24} className="text-accent-400" />
              </Button>
            ) : (
              // 削除ボタン
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onClick={() => onToggleExistingImageRemoval(url)}
                disabled={disabled}
                aria-label={`画像${index + 1}を削除`}
                className="absolute -top-2 -right-2 !size-6 rounded-full shadow-md"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
