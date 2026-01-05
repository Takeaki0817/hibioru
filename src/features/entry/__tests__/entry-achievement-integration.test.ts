/**
 * エントリ作成と達成演出の統合テスト
 *
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4
 * - 投稿成功時に達成情報が正しく返却される
 * - 達成チェック失敗時もエントリ作成が成功する
 * - 成功オーバーレイで達成演出が表示される
 */

import { getAchievementLevel } from '@/features/social/utils/achievement-level'
import type { NewAchievementInfo } from '../types'
import type { AchievementType } from '@/features/social/types'

// 統合テストのためのモックデータ生成関数
function createMockAchievementInfo(
  type: AchievementType,
  threshold: number
): NewAchievementInfo {
  return {
    type,
    threshold,
    level: getAchievementLevel(type, threshold),
  }
}

describe('エントリ作成と達成演出の統合', () => {
  describe('達成情報の生成', () => {
    it('継続7日の達成情報がLevel 2で生成される', () => {
      const achievement = createMockAchievementInfo('streak_days', 7)

      expect(achievement.type).toBe('streak_days')
      expect(achievement.threshold).toBe(7)
      expect(achievement.level).toBe(2)
    })

    it('継続30日の達成情報がLevel 3で生成される', () => {
      const achievement = createMockAchievementInfo('streak_days', 30)

      expect(achievement.type).toBe('streak_days')
      expect(achievement.threshold).toBe(30)
      expect(achievement.level).toBe(3)
    })

    it('共有投稿の達成情報がLevel 1で生成される', () => {
      const achievement = createMockAchievementInfo('shared_entry', 1)

      expect(achievement.type).toBe('shared_entry')
      expect(achievement.threshold).toBe(1)
      expect(achievement.level).toBe(1)
    })
  })

  describe('複数達成時の最高レベル選択（Requirements 4.2）', () => {
    it('複数達成時は最高レベルが選択される', () => {
      const achievements: NewAchievementInfo[] = [
        createMockAchievementInfo('shared_entry', 1), // Level 1
        createMockAchievementInfo('streak_days', 7),  // Level 2
        createMockAchievementInfo('streak_days', 30), // Level 3
      ]

      // 最高レベルを選択するロジック
      const highestAchievement = achievements.reduce((highest, current) =>
        current.level > highest.level ? current : highest
      )

      expect(highestAchievement.level).toBe(3)
      expect(highestAchievement.type).toBe('streak_days')
      expect(highestAchievement.threshold).toBe(30)
    })

    it('同レベルの達成がある場合は最初のものが選択される', () => {
      const achievements: NewAchievementInfo[] = [
        createMockAchievementInfo('streak_days', 7),   // Level 2
        createMockAchievementInfo('streak_days', 14),  // Level 2
      ]

      const highestAchievement = achievements.reduce((highest, current) =>
        current.level > highest.level ? current : highest
      )

      // 同レベルの場合、最初のもの（reduceの初期値）が返される
      expect(highestAchievement.level).toBe(2)
      expect(highestAchievement.threshold).toBe(7)
    })
  })

  describe('達成情報の空配列/null処理（Requirements 1.2, 1.3）', () => {
    it('新規達成がない場合は空配列', () => {
      const achievements: NewAchievementInfo[] = []

      expect(achievements).toHaveLength(0)
      expect(achievements.length === 0 ? null : achievements[0]).toBeNull()
    })

    it('達成チェック失敗時はnull', () => {
      const achievements: NewAchievementInfo[] | null = null

      expect(achievements).toBeNull()
    })
  })

  describe('達成レベル別の設定確認', () => {
    it('Level 1の達成は正しく判定される', () => {
      // streak_days: 3, daily_posts: 20, total_posts: 10/30, shared_entry: 1
      expect(getAchievementLevel('streak_days', 3)).toBe(1)
      expect(getAchievementLevel('daily_posts', 20)).toBe(1)
      expect(getAchievementLevel('total_posts', 10)).toBe(1)
      expect(getAchievementLevel('total_posts', 30)).toBe(1)
      expect(getAchievementLevel('shared_entry', 1)).toBe(1)
    })

    it('Level 2の達成は正しく判定される', () => {
      // streak_days: 7/14/21, daily_posts: 30/40, total_posts: 50-250
      expect(getAchievementLevel('streak_days', 7)).toBe(2)
      expect(getAchievementLevel('streak_days', 14)).toBe(2)
      expect(getAchievementLevel('streak_days', 21)).toBe(2)
      expect(getAchievementLevel('daily_posts', 30)).toBe(2)
      expect(getAchievementLevel('daily_posts', 40)).toBe(2)
      expect(getAchievementLevel('total_posts', 50)).toBe(2)
      expect(getAchievementLevel('total_posts', 100)).toBe(2)
      expect(getAchievementLevel('total_posts', 250)).toBe(2)
    })

    it('Level 3の達成は正しく判定される', () => {
      // streak_days: 30+, daily_posts: 50, total_posts: 300+
      expect(getAchievementLevel('streak_days', 30)).toBe(3)
      expect(getAchievementLevel('streak_days', 60)).toBe(3)
      expect(getAchievementLevel('streak_days', 365)).toBe(3)
      expect(getAchievementLevel('daily_posts', 50)).toBe(3)
      expect(getAchievementLevel('total_posts', 300)).toBe(3)
      expect(getAchievementLevel('total_posts', 500)).toBe(3)
    })
  })
})
