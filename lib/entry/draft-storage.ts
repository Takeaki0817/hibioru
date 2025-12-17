import type { Draft } from './types'

const DRAFT_STORAGE_KEY = 'hibioru_entry_draft'

/**
 * 下書きをローカルストレージに保存
 */
export function saveDraft(draft: Draft): void {
  if (typeof window === 'undefined') return // SSR対策

  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch (error) {
    console.error('下書き保存に失敗:', error)
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
  } catch (error) {
    console.error('下書き読み込みに失敗:', error)
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
  } catch (error) {
    console.error('下書き削除に失敗:', error)
  }
}
