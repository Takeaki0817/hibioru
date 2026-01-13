'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PlanCard } from './plan-card'
import { createCheckoutSession } from '../api/checkout-service'
import { PLAN_INFO } from '../constants'

/**
 * プラン選択コンポーネント
 * 月額・年額プランカードを表示し、Stripe Checkoutに遷移
 */
export function PlanSelection() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (selectedPlanType: 'premium_monthly' | 'premium_yearly') => {
    setIsLoading(true)
    setError(null)

    const result = await createCheckoutSession({ planType: selectedPlanType })

    if (result.data) {
      window.location.href = result.data.url
    } else {
      setError(result.serverError ?? 'エラーが発生しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 戻るボタン */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/social">
            <ArrowLeft className="size-4 mr-1" />
            設定に戻る
          </Link>
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* プランカード */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard
          plan={PLAN_INFO.premium_monthly}
          onSelect={() => handleUpgrade('premium_monthly')}
          disabled={isLoading}
          data-testid="plan-card-monthly"
        />
        <PlanCard
          plan={PLAN_INFO.premium_yearly}
          onSelect={() => handleUpgrade('premium_yearly')}
          disabled={isLoading}
          recommended
          data-testid="plan-card-yearly"
        />
      </div>
    </div>
  )
}
