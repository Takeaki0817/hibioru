'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getFollowCounts } from '../api/follows'
import { FollowListSheet } from './follow-list-sheet'
import type { FollowCounts } from '../types'

/**
 * フォロー統計セクション
 * フォロー数・フォロワー数を表示し、クリックでリストを表示
 */
export function FollowStatsSection() {
  const [counts, setCounts] = useState<FollowCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTab, setSheetTab] = useState<'following' | 'followers'>('following')

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

  const handleOpenSheet = (tab: 'following' | 'followers') => {
    setSheetTab(tab)
    setSheetOpen(true)
  }

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
    <>
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-center gap-8">
            {/* フォロー中 */}
            <button
              onClick={() => handleOpenSheet('following')}
              className="text-center hover:bg-accent/50 rounded-lg px-4 py-2 transition-colors"
            >
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <Users className="size-4" />
                {counts.followingCount}
              </div>
              <div className="text-sm text-muted-foreground">フォロー中</div>
            </button>

            {/* フォロワー */}
            <button
              onClick={() => handleOpenSheet('followers')}
              className="text-center hover:bg-accent/50 rounded-lg px-4 py-2 transition-colors"
            >
              <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                <UserPlus className="size-4" />
                {counts.followerCount}
              </div>
              <div className="text-sm text-muted-foreground">フォロワー</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <FollowListSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialTab={sheetTab}
        followingCount={counts.followingCount}
        followerCount={counts.followerCount}
      />
    </>
  )
}
