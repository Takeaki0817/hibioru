'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { queryKeys } from '@/lib/constants/query-keys'
import { getFollowCounts } from '../api/follows'
import { FollowListContent } from './follow-list-content'
import { ANIMATION_CONFIG } from '../constants'

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
    <div className="flex items-center gap-1">
      {/* フォロー中 Drawer */}
      <Drawer>
        <DrawerTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={ANIMATION_CONFIG.springDefault}
            className="flex items-center gap-1.5 px-1 md:px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <span className="text-xs md:text-sm text-muted-foreground">フォロー</span>
            <span className="text-xs md:text-sm font-semibold text-primary-600 dark:text-primary-400">
              {counts.followingCount}
            </span>
          </motion.button>
        </DrawerTrigger>
        <DrawerContent className="h-[70lvh] px-4">
          <FollowListContent
            defaultTab="following"
            followingCount={counts.followingCount}
            followerCount={counts.followerCount}
          />
        </DrawerContent>
      </Drawer>

      {/* フォロワー Drawer */}
      <Drawer>
        <DrawerTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={ANIMATION_CONFIG.springDefault}
            className="flex items-center gap-1.5 px-1 md:px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <span className="text-xs md:text-sm text-muted-foreground">フォロワー</span>
            <span className="text-xs md:text-sm font-semibold text-primary-600 dark:text-primary-400">
              {counts.followerCount}
            </span>
          </motion.button>
        </DrawerTrigger>
        <DrawerContent className="h-[70lvh] px-4">
          <FollowListContent
            defaultTab="followers"
            followingCount={counts.followingCount}
            followerCount={counts.followerCount}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

// スケルトンローディング（コンパクト版）
function StatsSkeleton() {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <div className="size-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <div className="size-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-14 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}
