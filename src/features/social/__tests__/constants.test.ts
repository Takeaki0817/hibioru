import {
  validateUsername,
  validateDisplayName,
  sanitizeDisplayName,
  escapeIlikeWildcards,
  getAchievementMessage,
  ACHIEVEMENT_THRESHOLDS,
  ACHIEVEMENT_TYPE_LABELS,
  USERNAME_RULES,
  DISPLAY_NAME_RULES,
} from '../constants'

describe('バリデーション・定数', () => {
  describe('validateUsername', () => {
    it('有効なユーザー名を検証する', () => {
      // Arrange & Act
      const result = validateUsername('valid_user123')

      // Assert
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('3文字未満はエラーを返す', () => {
      // Arrange & Act
      const result = validateUsername('ab')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_SHORT)
    })

    it('20文字超過はエラーを返す', () => {
      // Arrange & Act
      const result = validateUsername('a'.repeat(21))

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.TOO_LONG)
    })

    it('最小長の3文字は有効', () => {
      // Arrange & Act
      const result = validateUsername('abc')

      // Assert
      expect(result.valid).toBe(true)
    })

    it('最大長の20文字は有効', () => {
      // Arrange & Act
      const result = validateUsername('a'.repeat(20))

      // Assert
      expect(result.valid).toBe(true)
    })

    it('英数字とアンダースコア以外はエラーを返す', () => {
      // Arrange & Act
      const result = validateUsername('user-name')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('空白を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateUsername('user name')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('特殊文字を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateUsername('user@domain')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('大文字と小文字の混在は有効', () => {
      // Arrange & Act
      const result = validateUsername('UserName123')

      // Assert
      expect(result.valid).toBe(true)
    })
  })

  describe('validateDisplayName', () => {
    it('有効な表示名を検証する', () => {
      // Arrange & Act
      const result = validateDisplayName('太郎のプロフィール')

      // Assert
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('空文字列はエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_SHORT)
    })

    it('空白のみはエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('   ')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_SHORT)
    })

    it('50文字超過はエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('あ'.repeat(51))

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_LONG)
    })

    it('50文字ちょうどは有効', () => {
      // Arrange & Act
      const result = validateDisplayName('a'.repeat(50))

      // Assert
      expect(result.valid).toBe(true)
    })

    it('<文字を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('ユーザー<script>')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('> 文字を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('ユーザー>')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('"文字を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('ユーザー"')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it("' 文字を含むとエラーを返す", () => {
      // Arrange & Act
      const result = validateDisplayName("ユーザー'")

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('&文字を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('ユーザー&管理者')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('制御文字を含むとエラーを返す', () => {
      // Arrange & Act
      const result = validateDisplayName('ユーザー\x00')

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS)
    })

    it('先頭と末尾の空白を自動削除', () => {
      // Arrange & Act
      const result = validateDisplayName('  太郎  ')

      // Assert
      expect(result.valid).toBe(true)
    })

    it('日本語文字を含む表示名は有効', () => {
      // Arrange & Act
      const result = validateDisplayName('田中太郎')

      // Assert
      expect(result.valid).toBe(true)
    })

    it('emoji を含む表示名は有効', () => {
      // Arrange & Act
      const result = validateDisplayName('ユーザー😀')

      // Assert
      expect(result.valid).toBe(true)
    })
  })

  describe('sanitizeDisplayName', () => {
    it('制御文字を除去して返す', () => {
      // Arrange & Act
      const result = sanitizeDisplayName('ユーザー\x00\x01')

      // Assert
      expect(result).toBe('ユーザー')
    })

    it('先頭と末尾の空白を削除', () => {
      // Arrange & Act
      const result = sanitizeDisplayName('  太郎  ')

      // Assert
      expect(result).toBe('太郎')
    })

    it('最大長(50文字)を超えた場合は切り詰める', () => {
      // Arrange & Act
      const result = sanitizeDisplayName('a'.repeat(60))

      // Assert
      expect(result).toHaveLength(50)
    })

    it('正常な文字列はそのまま返す', () => {
      // Arrange & Act
      const result = sanitizeDisplayName('太郎のプロフィール')

      // Assert
      expect(result).toBe('太郎のプロフィール')
    })
  })

  describe('escapeIlikeWildcards', () => {
    it('バックスラッシュをエスケープ', () => {
      // Arrange & Act
      const result = escapeIlikeWildcards('user\\name')

      // Assert
      expect(result).toBe('user\\\\name')
    })

    it('%をエスケープ', () => {
      // Arrange & Act
      const result = escapeIlikeWildcards('user%abc')

      // Assert
      expect(result).toBe('user\\%abc')
    })

    it('_をエスケープ', () => {
      // Arrange & Act
      const result = escapeIlikeWildcards('user_abc')

      // Assert
      expect(result).toBe('user\\_abc')
    })

    it('複数の特殊文字をエスケープ', () => {
      // Arrange & Act
      const result = escapeIlikeWildcards('user%abc_def\\ghi')

      // Assert
      expect(result).toBe('user\\%abc\\_def\\\\ghi')
    })

    it('エスケープが必要ない文字列はそのまま返す', () => {
      // Arrange & Act
      const result = escapeIlikeWildcards('username')

      // Assert
      expect(result).toBe('username')
    })

    it('日本語文字はエスケープされない', () => {
      // Arrange & Act
      const result = escapeIlikeWildcards('太郎%検索')

      // Assert
      expect(result).toBe('太郎\\%検索')
    })
  })

  describe('getAchievementMessage', () => {
    it('daily_posts メッセージを生成する', () => {
      // Arrange & Act
      const result = getAchievementMessage('daily_posts', 20)

      // Assert
      expect(result).toBe('今日20回投稿しました！')
    })

    it('total_posts メッセージを生成する', () => {
      // Arrange & Act
      const result = getAchievementMessage('total_posts', 100)

      // Assert
      expect(result).toBe('累計100投稿達成！')
    })

    it('streak_days メッセージを生成する', () => {
      // Arrange & Act
      const result = getAchievementMessage('streak_days', 7)

      // Assert
      expect(result).toBe('7日連続記録達成！')
    })

    it('shared_entry メッセージを生成する', () => {
      // Arrange & Act
      const result = getAchievementMessage('shared_entry', 1)

      // Assert
      expect(result).toBe('投稿を共有しました')
    })

    it('異なる数値でメッセージを生成する', () => {
      // Arrange & Act
      const result1 = getAchievementMessage('daily_posts', 50)
      const result2 = getAchievementMessage('total_posts', 1000)
      const result3 = getAchievementMessage('streak_days', 365)

      // Assert
      expect(result1).toBe('今日50回投稿しました！')
      expect(result2).toBe('累計1000投稿達成！')
      expect(result3).toBe('365日連続記録達成！')
    })
  })

  describe('ACHIEVEMENT_THRESHOLDS', () => {
    it('daily_posts 閾値がすべて定義されている', () => {
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toBeDefined()
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts.length).toBeGreaterThan(0)
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toContain(20)
      expect(ACHIEVEMENT_THRESHOLDS.daily_posts).toContain(50)
    })

    it('total_posts 閾値がすべて定義されている', () => {
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toBeDefined()
      expect(ACHIEVEMENT_THRESHOLDS.total_posts.length).toBeGreaterThan(0)
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toContain(10)
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toContain(100)
      expect(ACHIEVEMENT_THRESHOLDS.total_posts).toContain(500)
    })

    it('streak_days 閾値がすべて定義されている', () => {
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toBeDefined()
      expect(ACHIEVEMENT_THRESHOLDS.streak_days.length).toBeGreaterThan(0)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(3)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(7)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(30)
      expect(ACHIEVEMENT_THRESHOLDS.streak_days).toContain(365)
    })

    it('daily_posts 閾値は昇順', () => {
      const thresholds = ACHIEVEMENT_THRESHOLDS.daily_posts
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThanOrEqual(thresholds[i - 1])
      }
    })

    it('total_posts 閾値は昇順', () => {
      const thresholds = ACHIEVEMENT_THRESHOLDS.total_posts
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThanOrEqual(thresholds[i - 1])
      }
    })

    it('streak_days 閾値は昇順', () => {
      const thresholds = ACHIEVEMENT_THRESHOLDS.streak_days
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThanOrEqual(thresholds[i - 1])
      }
    })
  })

  describe('ACHIEVEMENT_TYPE_LABELS', () => {
    it('すべての達成タイプにラベルが定義されている', () => {
      expect(ACHIEVEMENT_TYPE_LABELS.daily_posts).toBeDefined()
      expect(ACHIEVEMENT_TYPE_LABELS.total_posts).toBeDefined()
      expect(ACHIEVEMENT_TYPE_LABELS.streak_days).toBeDefined()
      expect(ACHIEVEMENT_TYPE_LABELS.shared_entry).toBeDefined()
    })

    it('ラベルが空文字列でない', () => {
      Object.values(ACHIEVEMENT_TYPE_LABELS).forEach((label) => {
        expect(label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('USERNAME_RULES', () => {
    it('MIN_LENGTH が 3', () => {
      expect(USERNAME_RULES.MIN_LENGTH).toBe(3)
    })

    it('MAX_LENGTH が 20', () => {
      expect(USERNAME_RULES.MAX_LENGTH).toBe(20)
    })

    it('PATTERN が英数字とアンダースコアのみ許可', () => {
      expect(USERNAME_RULES.PATTERN.test('valid_user123')).toBe(true)
      expect(USERNAME_RULES.PATTERN.test('user-name')).toBe(false)
      expect(USERNAME_RULES.PATTERN.test('user@name')).toBe(false)
    })

    it('すべてのエラーメッセージが定義されている', () => {
      expect(USERNAME_RULES.ERROR_MESSAGES.TOO_SHORT).toBeDefined()
      expect(USERNAME_RULES.ERROR_MESSAGES.TOO_LONG).toBeDefined()
      expect(USERNAME_RULES.ERROR_MESSAGES.INVALID_CHARS).toBeDefined()
      expect(USERNAME_RULES.ERROR_MESSAGES.TAKEN).toBeDefined()
    })
  })

  describe('DISPLAY_NAME_RULES', () => {
    it('MIN_LENGTH が 1', () => {
      expect(DISPLAY_NAME_RULES.MIN_LENGTH).toBe(1)
    })

    it('MAX_LENGTH が 50', () => {
      expect(DISPLAY_NAME_RULES.MAX_LENGTH).toBe(50)
    })

    it('FORBIDDEN_PATTERN が危険文字を禁止', () => {
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('<')).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('>')).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('"')).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test("'")).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('&')).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('\x00')).toBe(true)
    })

    it('制御文字が禁止', () => {
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('\x00')).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('\x1F')).toBe(true)
      expect(DISPLAY_NAME_RULES.FORBIDDEN_PATTERN.test('\x7F')).toBe(true)
    })

    it('すべてのエラーメッセージが定義されている', () => {
      expect(DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_SHORT).toBeDefined()
      expect(DISPLAY_NAME_RULES.ERROR_MESSAGES.TOO_LONG).toBeDefined()
      expect(DISPLAY_NAME_RULES.ERROR_MESSAGES.INVALID_CHARS).toBeDefined()
    })
  })
})
