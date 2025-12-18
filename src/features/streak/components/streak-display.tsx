import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  // 現在のストリークが最長記録と一致するかチェック
  const isNewRecord = currentStreak === longestStreak && currentStreak > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">継続記録</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ストリーク0日の場合の励ましメッセージ */}
        {currentStreak === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">まだ記録がありません</p>
            <p className="text-sm text-muted-foreground">今日から始めましょう！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 現在のストリーク - 失いたくない資産として強調表示 */}
            <div className={`p-4 rounded-lg ${isNewRecord ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 dark:from-orange-950 dark:to-yellow-950 dark:border-orange-700' : 'bg-orange-50 dark:bg-orange-950'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <p className="text-sm text-muted-foreground">現在の継続</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentStreak}日</p>
                  </div>
                </div>
                {isNewRecord && (
                  <div className="text-right">
                    <span className="text-xl">🎉</span>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">最高記録更新中！</p>
                  </div>
                )}
              </div>
              {!isNewRecord && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">この記録を失わないように継続しよう</p>
              )}
            </div>

            {/* 最長記録 */}
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="text-sm text-muted-foreground">過去最長記録</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{longestStreak}日</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
