'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ExternalLink, Sparkles, Check, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createHotsureCheckoutSession } from '../api/checkout-service'
import { createPortalSession } from '../api/portal-service'
import { PLAN_INFO, HOTSURE_PACK_PRICE, HOTSURE_PACK_QUANTITY, isPremiumPlan } from '../constants'
import { usePlanLimits } from '../hooks/use-plan-limits'

// プレミアムプランのメリット（設定画面用）
const PREMIUM_BENEFITS = ['投稿数無制限', '画像添付無制限']

export function BillingSection() {
  const { planType, entryLimit, imageLimit, canceledAt, currentPeriodEnd, isLoading: isLimitsLoading } = usePlanLimits()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPremium = isPremiumPlan(planType)

  // キャンセル済みで期限内かどうか
  const isCanceledButActive = canceledAt && currentPeriodEnd && currentPeriodEnd > new Date()

  const handleManageSubscription = async () => {
    setIsLoading(true)
    setError(null)

    const result = await createPortalSession()

    if (result.ok) {
      window.location.href = result.value.url
    } else {
      setError(result.error.message)
      setIsLoading(false)
    }
  }

  const handleHotsurePurchase = async () => {
    setIsLoading(true)
    setError(null)

    const result = await createHotsureCheckoutSession()

    if (result.ok) {
      window.location.href = result.value.url
    } else {
      setError(result.error.message)
      setIsLoading(false)
    }
  }

  return (
    <Card data-testid="billing-section">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          プラン・お支払い
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 現在のプラン表示 */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">現在のプラン</span>
              <Badge variant={isPremium ? 'default' : 'secondary'} data-testid="current-plan-badge">
                {PLAN_INFO[planType].name}
              </Badge>
              {isCanceledButActive && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  キャンセル済み
                </Badge>
              )}
            </div>
          </div>

          {/* キャンセル済みで期限内の場合は有効期限を表示 */}
          {isCanceledButActive && currentPeriodEnd && (
            <p className="text-sm text-orange-600 mt-2">
              {currentPeriodEnd.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}まで利用可能
            </p>
          )}

          {/* 無料プランの場合は残り制限を表示 */}
          {!isPremium && !isLimitsLoading && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
              {entryLimit && entryLimit.limit !== null && (
                <span data-testid="entry-limit">
                  今日の投稿: {entryLimit.remaining}/{entryLimit.limit}件
                </span>
              )}
              {imageLimit && imageLimit.limit !== null && (
                <span data-testid="image-limit">
                  今月の画像: {imageLimit.remaining}/{imageLimit.limit}枚
                </span>
              )}
            </div>
          )}
        </div>

        {/* 無料プランの場合: プレミアムへのアップグレード案内 */}
        {!isPremium && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">プレミアムにアップグレード</h4>
            <ul className="space-y-2">
              {PREMIUM_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full" data-testid="upgrade-link">
              <Link href="/social/plans">
                プレミアムプランに切り替える
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        {/* プレミアムの場合: サブスクリプション管理ボタン */}
        {isPremium && (
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="w-full"
            data-testid="manage-subscription-btn"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            プラン・お支払いを管理
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        )}

        {/* ほつれ購入セクション */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                ほつれを追加購入
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {HOTSURE_PACK_QUANTITY}回分のほつれを¥{HOTSURE_PACK_PRICE}で購入できます
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHotsurePurchase}
              disabled={isLoading}
              data-testid="purchase-hotsure-btn"
            >
              購入
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
