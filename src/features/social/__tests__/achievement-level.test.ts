/**
 * 達成レベル判定ユーティリティのテスト
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * - Level 1: 継続3日、1日20投稿、累計10/30投稿、共有投稿
 * - Level 2: 継続7/14/21日、1日30/40投稿、累計50-250投稿
 * - Level 3: 継続30日以上、1日50投稿、累計300投稿以上
 */
import { getAchievementLevel, type AchievementLevel } from '../utils/achievement-level'

describe('getAchievementLevel', () => {
  describe('streak_days（継続日数）', () => {
    it('継続3日はLevel 1を返す', () => {
      expect(getAchievementLevel('streak_days', 3)).toBe(1)
    })

    it('継続7日はLevel 2を返す', () => {
      expect(getAchievementLevel('streak_days', 7)).toBe(2)
    })

    it('継続14日はLevel 2を返す', () => {
      expect(getAchievementLevel('streak_days', 14)).toBe(2)
    })

    it('継続21日はLevel 2を返す', () => {
      expect(getAchievementLevel('streak_days', 21)).toBe(2)
    })

    it('継続30日はLevel 3を返す', () => {
      expect(getAchievementLevel('streak_days', 30)).toBe(3)
    })

    it('継続60日はLevel 3を返す', () => {
      expect(getAchievementLevel('streak_days', 60)).toBe(3)
    })

    it('継続90日はLevel 3を返す', () => {
      expect(getAchievementLevel('streak_days', 90)).toBe(3)
    })

    it('継続120日はLevel 3を返す', () => {
      expect(getAchievementLevel('streak_days', 120)).toBe(3)
    })

    it('継続365日はLevel 3を返す', () => {
      expect(getAchievementLevel('streak_days', 365)).toBe(3)
    })
  })

  describe('daily_posts（1日の投稿数）', () => {
    it('1日20投稿はLevel 1を返す', () => {
      expect(getAchievementLevel('daily_posts', 20)).toBe(1)
    })

    it('1日30投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('daily_posts', 30)).toBe(2)
    })

    it('1日40投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('daily_posts', 40)).toBe(2)
    })

    it('1日50投稿はLevel 3を返す', () => {
      expect(getAchievementLevel('daily_posts', 50)).toBe(3)
    })
  })

  describe('total_posts（総投稿数）', () => {
    it('累計10投稿はLevel 1を返す', () => {
      expect(getAchievementLevel('total_posts', 10)).toBe(1)
    })

    it('累計30投稿はLevel 1を返す', () => {
      expect(getAchievementLevel('total_posts', 30)).toBe(1)
    })

    it('累計50投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('total_posts', 50)).toBe(2)
    })

    it('累計100投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('total_posts', 100)).toBe(2)
    })

    it('累計150投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('total_posts', 150)).toBe(2)
    })

    it('累計200投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('total_posts', 200)).toBe(2)
    })

    it('累計250投稿はLevel 2を返す', () => {
      expect(getAchievementLevel('total_posts', 250)).toBe(2)
    })

    it('累計300投稿はLevel 3を返す', () => {
      expect(getAchievementLevel('total_posts', 300)).toBe(3)
    })

    it('累計400投稿はLevel 3を返す', () => {
      expect(getAchievementLevel('total_posts', 400)).toBe(3)
    })

    it('累計500投稿はLevel 3を返す', () => {
      expect(getAchievementLevel('total_posts', 500)).toBe(3)
    })
  })

  describe('shared_entry（共有投稿）', () => {
    it('共有投稿はLevel 1を返す（固定）', () => {
      expect(getAchievementLevel('shared_entry', 1)).toBe(1)
    })
  })

  describe('未定義の閾値', () => {
    it('定義されていない閾値はデフォルトでLevel 1を返す', () => {
      // streak_daysで未定義の閾値
      expect(getAchievementLevel('streak_days', 5)).toBe(1)
      // daily_postsで未定義の閾値
      expect(getAchievementLevel('daily_posts', 25)).toBe(1)
      // total_postsで未定義の閾値
      expect(getAchievementLevel('total_posts', 75)).toBe(1)
    })
  })

  describe('型チェック', () => {
    it('戻り値はAchievementLevel型（1 | 2 | 3）である', () => {
      const level: AchievementLevel = getAchievementLevel('streak_days', 7)
      expect([1, 2, 3]).toContain(level)
    })
  })
})
