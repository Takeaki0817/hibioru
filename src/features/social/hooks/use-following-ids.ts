'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseFollowingIdsReturn {
  followingIds: string[]
  isLoading: boolean
  refetch: () => Promise<void>
}

/**
 * フォロー中のユーザーIDリストを取得
 *
 * 責務:
 * - Realtime購読用のフォロー中ユーザーIDリストを提供
 * - 認証済みユーザーのフォロー情報を取得
 */
export function useFollowingIds(): UseFollowingIdsReturn {
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchFollowingIds = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setFollowingIds([])
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (error) {
      console.error('フォロー中ユーザーの取得に失敗:', error.message)
      setFollowingIds([])
    } else {
      setFollowingIds(data.map((f) => f.following_id))
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchFollowingIds()
  }, [fetchFollowingIds])

  return {
    followingIds,
    isLoading,
    refetch: fetchFollowingIds,
  }
}
