'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { logger } from '@/lib/logger'
import { getFollowingIdsAction } from '../api/follows'

// 再レンダリング時の不要な配列生成を防ぐ
const EMPTY_ARRAY: string[] = []

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
 *
 * 実装:
 * - Server Action (getFollowingIdsAction) を使用
 * - E2EテストモードではRLSをバイパスしてデータ取得可能
 */
export function useFollowingIds(): UseFollowingIdsReturn {
  const queryClient = useQueryClient()

  const { data: followingIds = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: queryKeys.social.followingIds(),
    queryFn: async () => {
      const result = await getFollowingIdsAction()

      if (result?.serverError) {
        logger.error('フォロー中ユーザーの取得に失敗', result.serverError)
        return []
      }

      return result?.data || []
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
