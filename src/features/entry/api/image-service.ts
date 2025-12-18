import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'
import type { CompressedImage, ImageError, Result } from '../types'

/**
 * 画像を圧縮（200KB以下、WebP形式）
 */
export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Result<CompressedImage, ImageError>> {
  try {
    // 画像形式チェック
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'JPEG、PNG、WebP、GIF形式の画像を選択してください'
        }
      }
    }

    const options = {
      maxSizeMB: 0.2,           // 200KB
      maxWidthOrHeight: 1920,
      fileType: 'image/webp' as const,
      useWebWorker: true,
      onProgress
    }

    const compressedFile = await imageCompression(file, options)
    const previewUrl = URL.createObjectURL(compressedFile)

    return {
      ok: true,
      value: {
        file: compressedFile,
        previewUrl,
        originalSize: file.size,
        compressedSize: compressedFile.size
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'COMPRESSION_FAILED',
        message: error instanceof Error ? error.message : '画像の圧縮に失敗しました'
      }
    }
  }
}

/**
 * 画像をSupabase Storageにアップロード
 */
export async function uploadImage(
  file: File,
  userId: string
): Promise<Result<string, ImageError>> {
  try {
    const supabase = createClient()

    // 一意なファイル名生成: {user_id}/{timestamp}_{random}.webp
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const fileName = `${userId}/${timestamp}_${random}.webp`

    const { data, error } = await supabase.storage
      .from('entry-images')
      .upload(fileName, file, {
        contentType: 'image/webp',
        upsert: false
      })

    if (error) {
      return {
        ok: false,
        error: { code: 'UPLOAD_FAILED', message: error.message }
      }
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('entry-images')
      .getPublicUrl(data.path)

    return { ok: true, value: urlData.publicUrl }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'アップロードに失敗しました'
      }
    }
  }
}
