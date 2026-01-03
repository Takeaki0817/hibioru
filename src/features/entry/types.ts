// entry-input機能の型定義

import type { Entry } from '@/lib/types/database'
import type { Result } from '@/lib/types/result'

export type { Result }

export type { Entry }

export interface CreateEntryInput {
  content: string
  imageUrls: string[] | null
  isShared?: boolean  // ソーシャルタイムラインに共有するか
}

export interface UpdateEntryInput {
  content: string
  imageUrls: string[] | null
  isShared?: boolean  // ソーシャルタイムラインに共有するか
}

export interface CompressedImage {
  file: File
  previewUrl: string
  originalSize: number
  compressedSize: number
}

export interface Draft {
  content: string
  imagePreview: string | null  // Base64 data URL
  savedAt: string              // ISO 8601
}

export interface LimitStatus {
  allowed: boolean
  current: number
  limit: number
  remaining: number
}

export type EntryError =
  | { code: 'NOT_FOUND'; message: string }
  | { code: 'EDIT_EXPIRED'; message: string }
  | { code: 'UNAUTHORIZED'; message: string }
  | { code: 'DB_ERROR'; message: string }
  | { code: 'EMPTY_CONTENT'; message: string }

export type ImageError =
  | { code: 'COMPRESSION_FAILED'; message: string }
  | { code: 'UPLOAD_FAILED'; message: string }
  | { code: 'INVALID_TYPE'; message: string }

export type LimitError =
  | { code: 'DB_ERROR'; message: string }
