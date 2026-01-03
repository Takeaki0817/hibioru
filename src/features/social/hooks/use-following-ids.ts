'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/constants/query-keys'

interface UseFollowingIdsReturn {
  followingIds: string[]
  isLoading: boolean
  refetch: () => Promise<void>
}

/**
 * フォロー中のユーザーIDリストを取得（useQueryベース）
 *
 * 責務:
 * - Realtime購読用のフォロー中ユーザーIDリストを提供
 * - 認証済みユーザーのフォロー情報を取得
 * - TanStack Queryによるキャッシュ管理
 */
export function useFollowingIds(): UseFollowingIdsReturn {
  const queryClient = useQueryClient()

  const { data: followingIds = [], isLoading } = useQuery({
    queryKey: queryKeys.social.followingIds(),
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return []
      }

      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (error) {
        console.error('フォロー中ユーザーの取得に失敗:', error.message)
        return []
      }

      return data.map((f) => f.following_id)
    },
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.social.followingIds() })
  }

  return {
    followingIds,
    isLoading,
    refetch,
  }
}
