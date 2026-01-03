/**
 * Social Constants ユニットテスト
 * @jest-environment node
 */

import {
  validateUsername,
  getAchievementMessage,
  USERNAME_RULES,
  ACHIEVEMENT_THRESHOLDS,
} from '../constants'

describe('validateUsername', () => {
  describe('有効なユーザー名', () => {
    it('3文字の英字のみで有効', () => {
      const result = validateUsername('abc')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('20文字の英数字混合で有効', () => {
      const result = validateUsername('abcdefghij1234567890')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('アンダースコアを含む名前で有効', () => {
      const result = validateUsername('user_name_123')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('大文字小文字混合で有効', () => {
      const result = validateUsername('UserName')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('数字のみで有効', () => {
      const result = validateUsername('12345')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('無効なユーザー名 - 長さ制約', () => {
    it('2文字は短すぎてエラー', () => {
      const result = validateUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_SHORT)
    })

    it('1文字は短すぎてエラー', () => {
      const result = validateUsername('a')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_SHORT)
    })

    it('空文字は短すぎてエラー', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_SHORT)
    })

    it('21文字は長すぎてエラー', () => {
      const result = validateUsername('abcdefghij12345678901')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_LONG)
    })

    it('50文字は長すぎてエラー', () => {
      const result = validateUsername('a'.repeat(50))
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_LONG)
    })
  })

  describe('無効なユーザー名 - 文字制約', () => {
    it('日本語を含むとエラー', () => {
      const result = validateUsername('ユーザー名')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('スペースを含むとエラー', () => {
      const result = validateUsername('user name')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('ハイフンを含むとエラー', () => {
      const result = validateUsername('user-name')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('ドットを含むとエラー', () => {
      const result = validateUsername('user.name')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('@を含むとエラー', () => {
      const result = validateUsername('user@name')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('絵文字を含むとエラー', () => {
      const result = validateUsername('user🎉')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })
  })

  describe('境界値テスト', () => {
    it('3文字（最小長）で有効', () => {
      expect(validateUsername('abc').valid).toBe(true)
    })

    it('20文字（最大長）で有効', () => {
      expect(validateUsername('a'.repeat(20)).valid).toBe(true)
    })
  })
})

describe('getAchievementMessage', () => {
  describe('daily_posts タイプ', () => {
    it('20回投稿のメッセージ', () => {
      expect(getAchievementMessage('daily_posts', 20)).toBe('今日20回投稿しました！')
    })

    it('50回投稿のメッセージ', () => {
      expect(getAchievementMessage('daily_posts', 50)).toBe('今日50回投稿しました！')
    })
  })

  describe('total_posts タイプ', () => {
    it('10投稿達成のメッセージ', () => {
      expect(getAchievementMessage('total_posts', 10)).toBe('累計10投稿達成！')
    })

    it('100投稿達成のメッセージ', () => {
      expect(getAchievementMessage('total_posts', 100)).toBe('累計100投稿達成！')
    })

    it('1000投稿達成のメッセージ', () => {
      expect(getAchievementMessage('total_posts', 1000)).toBe('累計1000投稿達成！')
    })
  })

  describe('streak_days タイプ', () => {
    it('3日連続のメッセージ', () => {
      expect(getAchievementMessage('streak_days', 3)).toBe('3日連続記録達成！')
    })

    it('7日連続のメッセージ', () => {
      expect(getAchievementMessage('streak_days', 7)).toBe('7日連続記録達成！')
    })

    it('365日連続のメッセージ', () => {
      expect(getAchievementMessage('streak_days', 365)).toBe('365日連続記録達成！')
    })
  })

  describe('shared_entry タイプ', () => {
    it('共有投稿のメッセージ（threshold無視）', () => {
      expect(getAchievementMessage('shared_entry', 0)).toBe('投稿を共有しました')
      expect(getAchievementMessage('shared_entry', 1)).toBe('投稿を共有しました')
    })
  })
})

describe('ACHIEVEMENT_THRESHOLDS', () => {
  describe('daily_posts 閾値', () => {
    it('20から50まで10刻みで4段階', () => {
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toEqual([20, 30, 40, 50])
    })
  })

  describe('total_posts 閾値', () => {
    it('最初の10段階が正しいこと', () => {
      const first10 = ACHIEVEMENT_THRESHOLDS.total_posts.slice(0, 10)
      expect(first10).toEqual([10, 30, 50, 100, 150, 200, 250, 300, 400, 500])
    })

    it('500以降は100刻みであること', () => {
      // 500の次は600, 700, ...
      const after500 = ACHIEVEMENT_THRESHOLDS.total_posts.slice(10, 15)
      expect(after500).toEqual([600, 700, 800, 900, 1000])
    })
  })

  describe('streak_days 閾値', () => {
    it('最初の11段階が正しいこと', () => {
      const first11 = ACHIEVEMENT_THRESHOLDS.streak_days.slice(0, 11)
      expect(first11).toEqual([3, 7, 14, 30, 60, 90, 120, 150, 180, 240, 365])
    })

    it('365日以降は60刻みであること', () => {
      // 365の次は425, 485, ...
      const after365 = ACHIEVEMENT_THRESHOLDS.streak_days.slice(11, 14)
      expect(after365).toEqual([425, 485, 545])
    })
  })
})
