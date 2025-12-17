interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  // 現在のストリークが最長記録と一致するかチェック
  const isNewRecord = currentStreak === longestStreak && currentStreak > 0

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">継続記録</h3>

      {/* ストリーク0日の場合の励ましメッセージ */}
      {currentStreak === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-2">まだ記録がありません</p>
          <p className="text-sm text-gray-500">今日から始めましょう！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 現在のストリーク - 失いたくない資産として強調表示 */}
          <div className={`p-4 rounded-lg ${isNewRecord ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300' : 'bg-orange-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="text-sm text-gray-600">現在の継続</p>
                  <p className="text-2xl font-bold text-orange-600">{currentStreak}日</p>
                </div>
              </div>
              {isNewRecord && (
                <div className="text-right">
                  <span className="text-xl">🎉</span>
                  <p className="text-xs text-orange-600 font-semibold">最高記録更新中！</p>
                </div>
              )}
            </div>
            {!isNewRecord && (
              <p className="text-xs text-orange-600 mt-2">この記録を失わないように継続しよう</p>
            )}
          </div>

          {/* 最長記録 */}
          <div className="p-4 rounded-lg bg-yellow-50">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏆</span>
              <div>
                <p className="text-sm text-gray-600">過去最長記録</p>
                <p className="text-2xl font-bold text-yellow-600">{longestStreak}日</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
