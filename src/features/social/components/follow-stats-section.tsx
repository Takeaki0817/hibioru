'use client'

import { motion } from 'framer-motion'
import { Users, UserPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { queryKeys } from '@/lib/constants/query-keys'
import { getFollowCounts } from '../api/follows'
import { FollowListContent } from './follow-list-content'

// スプリングアニメーション設定
const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
}

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
            transition={springTransition}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">フォロー</span>
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
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
            transition={springTransition}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <UserPlus className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">フォロワー</span>
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
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
