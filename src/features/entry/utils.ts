import type { Entry } from './types'

/**
 * エントリが編集可能かチェック（24時間以内）
 */
export function isEditable(entry: Entry): boolean {
  const createdAt = new Date(entry.created_at)
  const now = new Date()
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  return hoursSinceCreation <= 24
}
