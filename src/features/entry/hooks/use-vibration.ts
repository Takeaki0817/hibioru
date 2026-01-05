'use client'

/**
 * バイブレーションフック
 *
 * Vibration APIの安全なラッパー。
 * デバイスサポート確認、レベル別振動パターン実行、未サポート時のサイレント失敗。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
import { useCallback, useMemo } from 'react'
import type { AchievementLevel } from '@/features/social/utils/achievement-level'

// 振動パターンの型
type VibrationPattern = number | number[]

// レベル別振動パターン
// - Level 1: 短い振動 100ms
// - Level 2: 中程度 100ms振動、50ms休止、100ms振動
// - Level 3: 長い 100ms振動、50ms休止を3回繰り返し
export const VIBRATION_PATTERNS: Record<AchievementLevel, VibrationPattern> = {
  1: 100,
  2: [100, 50, 100],
  3: [100, 50, 100, 50, 100, 50],
}

interface UseVibrationReturn {
  isSupported: boolean
  vibrate: (level: AchievementLevel) => void
}

/**
 * Vibration APIの安全なラッパーフック
 *
 * @returns isSupported - デバイスがVibration APIをサポートしているか
 * @returns vibrate - 達成レベルに応じた振動を実行する関数
 */
export function useVibration(): UseVibrationReturn {
  // サポート確認（SSR対応）
  const isSupported = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return 'vibrate' in navigator
  }, [])

  // 振動実行関数
  const vibrate = useCallback(
    (level: AchievementLevel) => {
      // サポートしていない場合は何もしない
      if (!isSupported) return

      // ドキュメントが非表示の場合はスキップ
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      // 振動実行
      const pattern = VIBRATION_PATTERNS[level]
      navigator.vibrate(pattern)
    },
    [isSupported]
  )

  return { isSupported, vibrate }
}
