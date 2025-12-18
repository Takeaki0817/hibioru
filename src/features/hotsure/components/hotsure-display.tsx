import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface HotsureDisplayProps {
  remaining: number
  max: number
}

export function HotsureDisplay({ remaining, max }: HotsureDisplayProps) {
  // ほつれ残りの状態に応じたスタイルを決定
  const getStatusColor = () => {
    if (remaining === 0) return 'bg-red-50 border-2 border-red-300 dark:bg-red-950 dark:border-red-700'
    if (remaining === 1) return 'bg-yellow-50 border-2 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700'
    return 'bg-blue-50 dark:bg-blue-950'
  }

  const getTextColor = () => {
    if (remaining === 0) return 'text-red-600 dark:text-red-400'
    if (remaining === 1) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  const getStatusMessage = () => {
    if (remaining === 0) return '⚠️ ほつれ切れ！明日まで記録を途切れさせないように注意'
    if (remaining === 1) return '⚡ 残りわずか！計画的に使いましょう'
    return '毎週2回まで記録をスキップできます'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">ほつれ（セーフティネット）</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ほつれ残り表示 */}
        <div className={`p-4 rounded-lg ${getStatusColor()}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🧵</span>
            <div>
              <p className="text-sm text-muted-foreground">残りほつれ</p>
              <p className={`text-2xl font-bold ${getTextColor()}`}>
                {remaining} / {max}回
              </p>
            </div>
          </div>
          <p className={`text-xs ${getTextColor()} font-medium`}>
            {getStatusMessage()}
          </p>
        </div>

        {/* ほつれの説明 */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 ほつれは毎週月曜日に2回まで自動補充されます。
            記録がない日は自動的に1回消費され、継続記録を守ります。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
