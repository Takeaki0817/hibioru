'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/constants/query-keys'
import type { LimitsResponse, LimitStatus, PlanType } from '../types'

async function fetchPlanLimits(): Promise<LimitsResponse> {
  const response = await fetch('/api/billing/limits')
  if (!response.ok) {
    throw new Error('Failed to fetch limits')
  }
  return response.json()
}

interface UsePlanLimitsResult {
  entryLimit: LimitStatus | null
  imageLimit: LimitStatus | null
  planType: PlanType
  canceledAt: Date | null
  currentPeriodEnd: Date | null
  // ほつれ残高
  hotsureRemaining: number
  bonusHotsure: number
  totalHotsure: number
  canPurchaseHotsure: boolean
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function usePlanLimits(): UsePlanLimitsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.billing.limits(),
    queryFn: fetchPlanLimits,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })

  // ほつれ残高
  const hotsureRemaining = data?.hotsureRemaining ?? 0
  const bonusHotsure = data?.bonusHotsure ?? 0
  const totalHotsure = hotsureRemaining + bonusHotsure

  return {
    entryLimit: data?.entryLimit ?? null,
    imageLimit: data?.imageLimit ?? null,
    planType: data?.planType ?? 'free',
    canceledAt: data?.canceledAt ? new Date(data.canceledAt) : null,
    currentPeriodEnd: data?.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
    hotsureRemaining,
    bonusHotsure,
    totalHotsure,
    canPurchaseHotsure: totalHotsure < 2,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
