'use client'

import { useSwipeable } from 'react-swipeable'

export interface UseSwipeNavigationOptions {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  minSwipeDistance?: number
  preventScrollOnSwipe?: boolean
}

export interface UseSwipeNavigationReturn {
  handlers: ReturnType<typeof useSwipeable>
  isSwiping: boolean
}

export function useSwipeNavigation(
  options: UseSwipeNavigationOptions
): UseSwipeNavigationReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
    preventScrollOnSwipe = false,
  } = options

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      onSwipeLeft()
    },
    onSwipedRight: () => {
      onSwipeRight()
    },
    delta: minSwipeDistance,
    preventScrollOnSwipe,
    trackMouse: true, // マウスでもスワイプ可能
  })

  return {
    handlers,
    isSwiping: false, // react-swipeableは内部でswipe状態を管理
  }
}
