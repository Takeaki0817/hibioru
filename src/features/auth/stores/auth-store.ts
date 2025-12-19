import { create } from 'zustand'
import type { User } from '@/lib/types/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  initialize: (user: User | null) => void
  reset: () => void
}

export type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isInitialized: false,
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  // 初期化（セッション取得後に呼び出し）
  initialize: (user) =>
    set({
      user,
      isLoading: false,
      isInitialized: true,
    }),

  // リセット（サインアウト時）
  reset: () => set({ ...initialState, isLoading: false, isInitialized: true }),
}))
