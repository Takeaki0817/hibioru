// 認証関連の型定義

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
}

export interface AuthError {
  type: 'network' | 'auth' | 'unknown' | 'cancelled'
  message: string
  retryable: boolean
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
}
