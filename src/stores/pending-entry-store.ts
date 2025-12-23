import { create } from 'zustand'
import type { CompressedImage } from '@/features/entry/types'

// ペンディング投稿のステータス
export type PendingEntryStatus = 'pending' | 'uploading' | 'saving' | 'success' | 'failed'

// ペンディング投稿データ
export interface PendingEntry {
  id: string // 一時ID
  content: string
  images: CompressedImage[] // 未アップロード画像
  status: PendingEntryStatus
  error?: string
  createdAt: Date // 表示用タイムスタンプ
}

// 初期状態
const initialState = {
  pendingEntry: null as PendingEntry | null,
}

interface PendingEntryState {
  pendingEntry: PendingEntry | null
}

interface PendingEntryActions {
  // 投稿開始（一時IDを返す）
  startSubmit: (content: string, images: CompressedImage[]) => string
  // ステータス更新
  setStatus: (status: PendingEntryStatus, error?: string) => void
  // クリア
  clear: () => void
}

export type PendingEntryStore = PendingEntryState & PendingEntryActions

// ペンディング投稿が存在し、処理中かどうかを判定するセレクター
export const selectIsPending = (state: PendingEntryState): boolean =>
  state.pendingEntry !== null && state.pendingEntry.status !== 'success'

// エラー状態かどうかを判定するセレクター
export const selectHasError = (state: PendingEntryState): boolean =>
  state.pendingEntry?.status === 'failed'

export const usePendingEntryStore = create<PendingEntryStore>((set) => ({
  ...initialState,

  // 投稿開始
  startSubmit: (content, images) => {
    const id = `pending-${Date.now()}`
    set({
      pendingEntry: {
        id,
        content,
        images,
        status: 'pending',
        createdAt: new Date(),
      },
    })
    return id
  },

  // ステータス更新
  setStatus: (status, error) =>
    set((state) => {
      if (!state.pendingEntry) return state
      return {
        pendingEntry: {
          ...state.pendingEntry,
          status,
          error,
        },
      }
    }),

  // クリア
  clear: () => set(initialState),
}))
