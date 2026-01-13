'use client'

import { useMemo, useRef, useState, useEffect } from 'react'

/**
 * useFlameIntensity の返り値
 */
interface UseFlameIntensityResult {
  /** 炎のスケール（0.9-1.3） */
  scale: number
  /** 新記録到達時にtrue（100msでfalseに戻る） */
  shouldExplode: boolean
}

/**
 * ストリーク数から炎のスケールマッピング
 */
const SCALE_THRESHOLDS: Array<{ min: number; max: number; scale: number }> = [
  { min: 1, max: 3, scale: 0.9 },
  { min: 4, max: 7, scale: 1.0 },
  { min: 8, max: 14, scale: 1.1 },
  { min: 15, max: 30, scale: 1.2 },
  { min: 31, max: Infinity, scale: 1.3 },
]

/**
 * ストリーク数に応じたスケールを取得
 */
function getFlameScale(streak: number): number {
  if (streak <= 0) {
    return 0
  }

  const threshold = SCALE_THRESHOLDS.find(
    (t) => streak >= t.min && streak <= t.max
  )

  return threshold?.scale ?? 0
}

/**
 * ストリーク数から炎のスケールを計算するフック
 *
 * @param currentStreak - 現在のストリーク数
 * @param longestStreak - 最長ストリーク記録
 * @returns スケールとエクスプロードフラグ
 */
export function useFlameIntensity(
  currentStreak: number,
  longestStreak: number
): UseFlameIntensityResult {
  // 前回の最長記録到達状態を追跡
  const prevWasLongestRef = useRef<boolean>(false)
  const [shouldExplode, setShouldExplode] = useState(false)

  // 炎のスケールを計算
  const scale = useMemo(
    () => getFlameScale(currentStreak),
    [currentStreak]
  )

  // 新記録検出ロジック
  useEffect(() => {
    let isMounted = true

    const checkNewRecord = async () => {
      const isCurrentlyLongest = currentStreak === longestStreak && currentStreak > 0
      const wasLongest = prevWasLongestRef.current

      // 前回は最長記録に到達していなかったが、今回到達した場合
      if (isCurrentlyLongest && !wasLongest) {
        if (!isMounted) return
        setShouldExplode(true)
        prevWasLongestRef.current = true

        // 100msでfalseに戻す
        await new Promise((resolve) => setTimeout(resolve, 100))
        if (!isMounted) return
        setShouldExplode(false)
      } else if (!isCurrentlyLongest) {
        // 最長記録から外れた場合
        prevWasLongestRef.current = false
      }
    }

    checkNewRecord()

    return () => {
      isMounted = false
    }
  }, [currentStreak, longestStreak])

  return {
    scale,
    shouldExplode,
  }
}
