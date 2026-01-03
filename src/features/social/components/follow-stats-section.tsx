'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { getFollowCounts } from '../api/follows'
import { FollowListContent } from './follow-list-content'
import type { FollowCounts } from '../types'

/**
 * フォロー統計セクション
 * フォロー数・フォロワー数を表示し、クリックでリストを表示
 */
export function FollowStatsSection() {
  const [counts, setCounts] = useState<FollowCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCounts() {
      setIsLoading(true)
      const result = await getFollowCounts()
      setIsLoading(false)

      if (result.ok) {
        setCounts(result.value)
      }
    }

    loadCounts()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-center gap-8">
            <div className="text-center animate-pulse">
              <div className="h-6 w-12 bg-muted rounded mx-auto mb-1" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
            <div className="text-center animate-pulse">
              <div className="h-6 w-12 bg-muted rounded mx-auto mb-1" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!counts) {
    return null
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-center gap-8">
          {/* フォロー中 Drawer */}
          <Drawer>
            <DrawerTrigger asChild>
              <button className="text-center hover:bg-accent/50 rounded-lg px-4 py-2 transition-colors">
                <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                  <Users className="size-4" />
                  {counts.followingCount}
                </div>
                <div className="text-sm text-muted-foreground">フォロー中</div>
              </button>
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
              <button className="text-center hover:bg-accent/50 rounded-lg px-4 py-2 transition-colors">
                <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                  <UserPlus className="size-4" />
                  {counts.followerCount}
                </div>
                <div className="text-sm text-muted-foreground">フォロワー</div>
              </button>
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
      </CardContent>
    </Card>
  )
}
