'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
 * - Supabase Authから現在ログイン中のユーザーIDを取得
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
  const [userId, setUserId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id)
      setIsLoading(false)
    })
  }, [])

  return {
    userId,
    isLoading,
  }
}
