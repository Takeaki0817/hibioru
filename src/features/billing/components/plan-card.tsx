'use client'

import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanInfo } from '../types'

interface PlanCardProps {
  plan: PlanInfo
  onSelect: () => void
  disabled?: boolean
  recommended?: boolean
  'data-testid'?: string
}

export function PlanCard({
  plan,
  onSelect,
  disabled = false,
  recommended = false,
  'data-testid': testId,
}: PlanCardProps) {
  const intervalLabel = plan.interval === 'month' ? '月額' : plan.interval === 'year' ? '年額' : ''

  return (
    <Card
      className={cn(
        'relative transition-all',
        recommended && 'border-primary ring-1 ring-primary'
      )}
      data-testid={testId}
    >
      {recommended && (
        <Badge
          className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
          variant="default"
          data-testid="recommended-badge"
        >
          おすすめ
        </Badge>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <div className="mt-2">
          <span className="text-2xl font-bold">
            {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
          </span>
          {intervalLabel && (
            <span className="text-sm text-muted-foreground ml-1">
              /{intervalLabel}
            </span>
          )}
        </div>
        {plan.type === 'premium_yearly' && (
          <p className="text-xs text-muted-foreground mt-1">
            月額350円換算・約27%お得
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          onClick={onSelect}
          disabled={disabled}
          variant={recommended ? 'default' : 'outline'}
          data-testid="purchase-hotsure-btn"
        >
          {disabled ? '処理中...' : 'このプランを選択'}
        </Button>
      </CardContent>
    </Card>
  )
}
