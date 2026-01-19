import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  title: string
  titleSize?: 'lg' | 'xl'
  children: React.ReactNode
  className?: string
  'data-testid'?: string
}

/**
 * フィーチャーセクション用の共通カードコンポーネント
 * ソーシャルページのセクション、ストリーク表示、通知設定などで使用
 */
export function FeatureCard({
  title,
  titleSize = 'lg',
  children,
  className,
  'data-testid': testId,
}: FeatureCardProps) {
  return (
    <Card className={className} data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            titleSize === 'xl' ? 'text-xl' : 'text-lg'
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
