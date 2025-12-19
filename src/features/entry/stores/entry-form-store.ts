import { create } from 'zustand'
import type { CompressedImage } from '@/features/entry/types'

// 初期状態
const initialState = {
  // フォーム内容
  content: '',
  image: null as CompressedImage | null,

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
  image: CompressedImage | null

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
  setImage: (image: CompressedImage | null) => void

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
  initialize: (initialContent?: string) => void
  reset: () => void
}

export type EntryFormStore = EntryFormState & EntryFormActions

// canSubmitは派生状態として計算（セレクターで取得）
export const selectCanSubmit = (state: EntryFormState): boolean =>
  !state.isSubmitting && !state.isDeleting && !state.isSuccess && state.content.trim().length > 0

export const useEntryFormStore = create<EntryFormStore>((set) => ({
  ...initialState,

  // フォーム操作
  setContent: (content) => set({ content }),
  setImage: (image) => set({ image }),

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
  initialize: (initialContent = '') => set({ ...initialState, content: initialContent }),

  // リセット（アンマウント時に呼び出し）
  reset: () => set(initialState),
}))
