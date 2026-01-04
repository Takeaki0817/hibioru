'use client'

import { useState, useCallback } from 'react'
import { useCelebration } from './use-celebration'
import { generateParticles, PARTICLE_CONFIG } from '../constants'

// パーティクルの型
export interface Particle {
  id: number
  angle: number
  distance: number
  color: string
  size: string
  delay: number
}

export interface UseFeedItemOptions {
  achievementId: string
  initialIsCelebrated: boolean
  initialCount: number
}

export interface UseFeedItemReturn {
  // お祝い状態
  isCelebrated: boolean
  isPending: boolean
  toggle: () => void
  // パーティクルエフェクト
  showParticles: boolean
  particles: Particle[]
}

/**
 * フィードアイテムのお祝いロジックとパーティクルエフェクトを管理
 *
 * 責務:
 * - useCelebration のラッパー
 * - パーティクルエフェクトの状態管理
 * - 成功時のアニメーショントリガー
 */
export function useFeedItem({
  achievementId,
  initialIsCelebrated,
  initialCount,
}: UseFeedItemOptions): UseFeedItemReturn {
  const [showParticles, setShowParticles] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  // 成功時のコールバック（パーティクルエフェクト）
  const handleSuccess = useCallback((newState: boolean) => {
    if (newState) {
      setParticles(generateParticles())
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), PARTICLE_CONFIG.DURATION_MS)
    }
  }, [])

  const { isCelebrated, isPending, toggle } = useCelebration({
    achievementId,
    initialIsCelebrated,
    initialCount,
    onSuccess: handleSuccess,
  })

  return {
    isCelebrated,
    isPending,
    toggle,
    showParticles,
    particles,
  }
}
