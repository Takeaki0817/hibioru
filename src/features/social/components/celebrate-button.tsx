'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PartyPopper, Loader2 } from 'lucide-react'
import { celebrateAchievement, uncelebrateAchievement } from '../api/achievements'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/constants/query-keys'

interface CelebrateButtonProps {
  achievementId: string
  initialIsCelebrated: boolean
  celebrationCount: number
  onToggle?: (isCelebrated: boolean) => void
}

/**
 * お祝いボタン
 * 達成へのリアクション機能
 */
export function CelebrateButton({
  achievementId,
  initialIsCelebrated,
  celebrationCount,
  onToggle,
}: CelebrateButtonProps) {
  const queryClient = useQueryClient()
  const [isCelebrated, setIsCelebrated] = useState(initialIsCelebrated)
  const [count, setCount] = useState(celebrationCount)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      if (isCelebrated) {
        const result = await uncelebrateAchievement(achievementId)
        if (result.ok) {
          setIsCelebrated(false)
          setCount((prev) => Math.max(0, prev - 1))
          onToggle?.(false)
          // 成功時にソーシャル関連のクエリを強制的に再取得
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      } else {
        const result = await celebrateAchievement(achievementId)
        if (result.ok) {
          setIsCelebrated(true)
          setCount((prev) => prev + 1)
          onToggle?.(true)
          // 成功時にソーシャル関連のクエリを強制的に再取得
          await Promise.all([
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'feed'] }),
            queryClient.refetchQueries({ queryKey: [...queryKeys.social.all, 'notifications'] }),
          ])
        }
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'gap-1.5',
        isCelebrated && 'text-amber-500 hover:text-amber-600'
      )}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <PartyPopper className={cn('size-4', isCelebrated && 'fill-current')} />
      )}
      <span>{count > 0 ? count : 'お祝い'}</span>
    </Button>
  )
}
