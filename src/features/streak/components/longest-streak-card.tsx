import { Trophy } from 'lucide-react'

interface LongestStreakCardProps {
  longestStreak: number
  daysToNewRecord: number
  isNewRecord: boolean
  currentStreak: number
}

/**
 * 最長記録表示カード
 */
export function LongestStreakCard({
  longestStreak,
  daysToNewRecord,
  isNewRecord,
  currentStreak,
}: LongestStreakCardProps) {
  return (
    <div className="p-4 rounded-xl bg-reward-300/20 dark:bg-reward-400/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="size-8 text-reward-500 dark:text-reward-400" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted-foreground">過去最長記録</p>
            <p className="text-xl font-bold text-reward-500 dark:text-reward-400 tabular-nums">
              {longestStreak}日
            </p>
          </div>
        </div>
        {!isNewRecord && currentStreak > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">新記録まで</p>
            <p className="text-sm font-medium text-primary-500">あと{daysToNewRecord}日</p>
          </div>
        )}
      </div>
    </div>
  )
}
