/**
 * 達成レベル判定ユーティリティ
 *
 * 達成タイプと閾値からレベル（1, 2, 3）を導出する。
 * 既存のAchievementTypeと閾値定数を使用し、新規カラム追加は行わない。
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
import type { AchievementType } from '../types'

// 達成レベル型
export type AchievementLevel = 1 | 2 | 3

// レベル判定ルール
// Requirements:
// - Level 1: 継続3日、1日20投稿、累計10/30投稿、共有投稿
// - Level 2: 継続7/14/21日、1日30/40投稿、累計50-250投稿
// - Level 3: 継続30日以上、1日50投稿、累計300投稿以上
const LEVEL_THRESHOLDS: Record<AchievementType, Record<AchievementLevel, number[]>> = {
  streak_days: {
    1: [3],
    2: [7, 14, 21],
    3: [30, 60, 90, 120, 150, 180, 240, 365],
  },
  daily_posts: {
    1: [20],
    2: [30, 40],
    3: [50],
  },
  total_posts: {
    1: [10, 30],
    2: [50, 100, 150, 200, 250],
    3: [300, 400, 500],
  },
  shared_entry: {
    1: [1], // 共有投稿はLevel 1固定
    2: [],
    3: [],
  },
}

/**
 * 達成タイプと閾値からレベルを導出
 *
 * @param type - 達成タイプ
 * @param threshold - 達成した閾値
 * @returns 達成レベル（1, 2, 3）。未定義の閾値はデフォルトでLevel 1
 */
export function getAchievementLevel(type: AchievementType, threshold: number): AchievementLevel {
  const typeThresholds = LEVEL_THRESHOLDS[type]

  // Level 3 をチェック（最も高いレベルを優先）
  if (typeThresholds[3].includes(threshold)) {
    return 3
  }

  // Level 2 をチェック
  if (typeThresholds[2].includes(threshold)) {
    return 2
  }

  // Level 1 をチェック、または未定義の閾値はデフォルトでLevel 1
  return 1
}
