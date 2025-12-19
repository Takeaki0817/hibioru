import type { Draft } from '../types'

const DRAFT_STORAGE_KEY = 'hibioru_entry_draft'

/**
 * 下書きをローカルストレージに保存
 */
export function saveDraft(draft: Draft): void {
  if (typeof window === 'undefined') return // SSR対策

  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // ストレージ操作エラーは無視（セキュリティ制限等）
  }
}

/**
 * 下書きをローカルストレージから読み込み
 */
export function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null // SSR対策

  try {
    const item = localStorage.getItem(DRAFT_STORAGE_KEY)
    return item ? JSON.parse(item) : null
  } catch {
    // ストレージ操作エラーは無視（セキュリティ制限等）
    return null
  }
}

/**
 * 下書きをローカルストレージから削除
 */
export function clearDraft(): void {
  if (typeof window === 'undefined') return // SSR対策

  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // ストレージ操作エラーは無視（セキュリティ制限等）
  }
}
