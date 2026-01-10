'use client'

import { useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'

const TAB_ORDER = ['profile', 'social', 'notifications'] as const
export type SocialTabValue = (typeof TAB_ORDER)[number]

interface UseTabSwipeOptions {
  activeTab: SocialTabValue
  onTabChange: (tab: SocialTabValue) => void
}

/**
 * ソーシャルタブのスワイプナビゲーション用フック
 * 左スワイプで次のタブ、右スワイプで前のタブに移動
 */
export function useTabSwipe({ activeTab, onTabChange }: UseTabSwipeOptions) {
  const activeIndex = TAB_ORDER.indexOf(activeTab)

  const goToNext = useCallback(() => {
    if (activeIndex < TAB_ORDER.length - 1) {
      onTabChange(TAB_ORDER[activeIndex + 1])
    }
  }, [activeIndex, onTabChange])

  const goToPrev = useCallback(() => {
    if (activeIndex > 0) {
      onTabChange(TAB_ORDER[activeIndex - 1])
    }
  }, [activeIndex, onTabChange])

  const handlers = useSwipeable({
    onSwipedLeft: goToNext,
    onSwipedRight: goToPrev,
    delta: 50, // 最小スワイプ距離
    preventScrollOnSwipe: false,
    trackMouse: false, // モバイル専用
  })

  return { handlers, activeIndex }
}
