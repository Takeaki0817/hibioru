'use client'

import { useAuthStore, selectUserId } from '@/features/auth/stores/auth-store'

interface UseCurrentUserIdReturn {
  /** 現在のユーザーID（未ログイン時はundefined） */
  userId: string | undefined
  /** ユーザー情報取得中かどうか */
  isLoading: boolean
}

/**
 * 現在のユーザーIDを取得するフック
 *
 * 責務:
 * - AuthStoreから現在ログイン中のユーザーIDを取得
 * - ローディング状態の管理
 *
 * 使用例:
 * ```typescript
 * const { userId, isLoading } = useCurrentUserId()
 *
 * if (isLoading) return <Skeleton />
 * if (!userId) return <LoginPrompt />
 * ```
 */
export function useCurrentUserId(): UseCurrentUserIdReturn {
  const userId = useAuthStore(selectUserId)
  const isLoading = useAuthStore((s) => !s.isInitialized)

  return {
    userId,
    isLoading,
  }
}
