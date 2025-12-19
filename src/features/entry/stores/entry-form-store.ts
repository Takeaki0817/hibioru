import { create } from 'zustand'
import type { CompressedImage } from '@/features/entry/types'

// 画像の最大数
export const MAX_IMAGES = 2

// 初期状態
const initialState = {
  // フォーム内容
  content: '',
  images: [] as CompressedImage[], // 新規追加する画像（最大2枚）
  existingImageUrls: [] as string[], // 編集時の既存画像URL
  removedImageUrls: [] as string[], // 削除予定としてマークされた既存画像URL

  // UI状態
  isSubmitting: false,
  isDeleting: false,
  showDeleteConfirm: false,
  isSuccess: false,
  isFocused: false,

  // エラー
  error: null as string | null,
}

interface EntryFormState {
  // フォーム内容
  content: string
  images: CompressedImage[]
  existingImageUrls: string[]
  removedImageUrls: string[]

  // UI状態
  isSubmitting: boolean
  isDeleting: boolean
  showDeleteConfirm: boolean
  isSuccess: boolean
  isFocused: boolean

  // エラー
  error: string | null
}

interface EntryFormActions {
  // フォーム操作
  setContent: (content: string) => void
  addImage: (image: CompressedImage) => void
  removeImage: (index: number) => void
  toggleExistingImageRemoval: (url: string) => void

  // UI状態
  setSubmitting: (value: boolean) => void
  setDeleting: (value: boolean) => void
  setShowDeleteConfirm: (value: boolean) => void
  setSuccess: (value: boolean) => void
  setFocused: (value: boolean) => void
  setError: (error: string | null) => void

  // 複合アクション
  submitStart: () => void
  submitSuccess: () => void
  submitError: (msg: string) => void
  deleteStart: () => void
  deleteError: (msg: string) => void

  // 初期化/リセット
  initialize: (initialContent?: string, existingImageUrls?: string[] | null) => void
  reset: () => void
}

export type EntryFormStore = EntryFormState & EntryFormActions

// canSubmitは派生状態として計算（セレクターで取得）
export const selectCanSubmit = (state: EntryFormState): boolean =>
  !state.isSubmitting && !state.isDeleting && !state.isSuccess && state.content.trim().length > 0

// 現在の合計画像数を計算するセレクター
export const selectTotalImageCount = (state: EntryFormState): number => {
  const existingCount = state.existingImageUrls.filter(
    (url) => !state.removedImageUrls.includes(url)
  ).length
  return state.images.length + existingCount
}

// 画像追加可能かどうかを判定するセレクター
export const selectCanAddImage = (state: EntryFormState): boolean => {
  return selectTotalImageCount(state) < MAX_IMAGES
}

export const useEntryFormStore = create<EntryFormStore>((set) => ({
  ...initialState,

  // フォーム操作
  setContent: (content) => set({ content }),
  addImage: (image) =>
    set((state) => {
      // 最大数チェック
      if (selectTotalImageCount(state) >= MAX_IMAGES) {
        return state
      }
      return { images: [...state.images, image] }
    }),
  removeImage: (index) =>
    set((state) => {
      const newImages = [...state.images]
      const removed = newImages.splice(index, 1)[0]
      // プレビューURLを解放
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return { images: newImages }
    }),
  toggleExistingImageRemoval: (url) =>
    set((state) => {
      if (state.removedImageUrls.includes(url)) {
        // 削除予定から復帰
        return { removedImageUrls: state.removedImageUrls.filter((u) => u !== url) }
      } else {
        // 削除予定に追加
        return { removedImageUrls: [...state.removedImageUrls, url] }
      }
    }),

  // UI状態
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setDeleting: (isDeleting) => set({ isDeleting }),
  setShowDeleteConfirm: (showDeleteConfirm) => set({ showDeleteConfirm }),
  setSuccess: (isSuccess) => set({ isSuccess }),
  setFocused: (isFocused) => set({ isFocused }),
  setError: (error) => set({ error }),

  // 複合アクション
  submitStart: () => set({ isSubmitting: true, error: null }),
  submitSuccess: () => set({ isSubmitting: false, isSuccess: true }),
  submitError: (msg) => set({ isSubmitting: false, error: msg }),
  deleteStart: () => set({ isDeleting: true, error: null }),
  deleteError: (msg) => set({ isDeleting: false, error: msg, showDeleteConfirm: false }),

  // 初期化（ページ遷移時に呼び出し）
  initialize: (initialContent = '', existingImageUrls = null) =>
    set({
      ...initialState,
      content: initialContent,
      existingImageUrls: existingImageUrls ?? [],
    }),

  // リセット（アンマウント時に呼び出し）
  reset: () => set(initialState),
}))
