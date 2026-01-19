'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import { getFollowCounts } from '../api/follows'
import { ANIMATION_CONFIG } from '../constants'
import Link from 'next/link'

/**
 * フォロー統計（コンパクト版）
 * フォロー数・フォロワー数を横並びで表示
 * TanStack Query でキャッシュ管理し、楽観的更新に対応
 */
export function FollowStatsSection() {
  const { data: counts, isLoading } = useQuery({
    queryKey: queryKeys.social.myFollowCounts(),
    queryFn: async () => {
      const result = await getFollowCounts()
      if (!result.ok) {
        throw new Error(result.error?.message ?? 'フォロー数の取得に失敗しました')
      }
      return result.value
    },
    staleTime: 5 * 60 * 1000, // 5分
  })

  if (isLoading) {
    return <StatsSkeleton />
  }

  if (!counts) {
    return null
  }

  return (
    <div data-testid="follow-stats" className="flex items-center gap-1">
      {/* フォロー中リンク */}
      <Link
        href="/social/following"
        data-testid="following-link"
        aria-label={`フォロー中 ${counts.followingCount}人の一覧を表示`}
        className="flex items-center gap-1.5 px-1 md:px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <motion.div
          whileTap={{ scale: 0.95 }}
          transition={ANIMATION_CONFIG.springDefault}
          className="flex items-center gap-1.5"
        >
          <span className="text-xs md:text-sm text-muted-foreground" aria-hidden="true">
            フォロー
          </span>
          <span
            data-testid="following-count"
            className="text-xs md:text-sm font-semibold text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          >
            {counts.followingCount}
          </span>
        </motion.div>
      </Link>

      {/* フォロワーリンク */}
      <Link
        href="/social/followers"
        data-testid="follower-link"
        aria-label={`フォロワー ${counts.followerCount}人の一覧を表示`}
        className="flex items-center gap-1.5 px-1 md:px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <motion.div
          whileTap={{ scale: 0.95 }}
          transition={ANIMATION_CONFIG.springDefault}
          className="flex items-center gap-1.5"
        >
          <span className="text-xs md:text-sm text-muted-foreground" aria-hidden="true">
            フォロワー
          </span>
          <span
            data-testid="follower-count"
            className="text-xs md:text-sm font-semibold text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          >
            {counts.followerCount}
          </span>
        </motion.div>
      </Link>
    </div>
  )
}

// スケルトンローディング（コンパクト版）
function StatsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="フォロー情報を読み込み中" className="flex items-center gap-1">
      <span className="sr-only">フォロー情報を読み込み中...</span>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5" aria-hidden="true">
        <div className="size-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5" aria-hidden="true">
        <div className="size-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-14 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}
