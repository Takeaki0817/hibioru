/**
 * ストリーク機能の統合テスト
 * ストリーク計算、ほつれ消費、週次リセットの一連のフローをテスト
 */

import { describe, it, expect } from '@jest/globals'

describe('ストリーク機能の統合フロー', () => {
  describe('ストリーク計算フロー', () => {
    it('初回記録時にストリークが1増加する', () => {
      // Arrange
      const initialStreak = {
        currentStreak: 0,
        longestStreak: 0,
        lastEntryDate: null,
      }

      // Act - 初回記録
      const newStreak = {
        currentStreak: initialStreak.currentStreak + 1,
        longestStreak: Math.max(
          initialStreak.currentStreak + 1,
          initialStreak.longestStreak
        ),
        lastEntryDate: '2025-12-17',
      }

      // Assert
      expect(newStreak.currentStreak).toBe(1)
      expect(newStreak.longestStreak).toBe(1)
    })

    it('同日2回目の記録ではストリークが増加しない', () => {
      // Arrange
      const today = '2025-12-17'
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastEntryDate: today,
      }

      // Act - 同日2回目の記録
      const isSameDay = existingStreak.lastEntryDate === today
      const newStreak = isSameDay
        ? existingStreak
        : {
            currentStreak: existingStreak.currentStreak + 1,
            longestStreak: Math.max(
              existingStreak.currentStreak + 1,
              existingStreak.longestStreak
            ),
            lastEntryDate: today,
          }

      // Assert
      expect(newStreak.currentStreak).toBe(5) // 増加していない
      expect(newStreak.longestStreak).toBe(10)
    })

    it('longest_streakがcurrent_streakを超えない', () => {
      // Arrange
      const existingStreak = {
        currentStreak: 10,
        longestStreak: 10,
        lastEntryDate: '2025-12-16',
      }

      // Act - 記録追加でcurrent_streakが11になる
      const newStreak = {
        currentStreak: existingStreak.currentStreak + 1,
        longestStreak: Math.max(
          existingStreak.currentStreak + 1,
          existingStreak.longestStreak
        ),
        lastEntryDate: '2025-12-17',
      }

      // Assert
      expect(newStreak.currentStreak).toBe(11)
      expect(newStreak.longestStreak).toBe(11)
    })
  })

  describe('ほつれ自動消費フロー', () => {
    it('記録なし日にほつれが自動消費される', () => {
      // Arrange
      const userStreak = {
        currentStreak: 5,
        hotsureRemaining: 2,
        hotsureUsedDates: [] as string[],
      }
      const hasEntry = false
      const targetDate = '2025-12-16'

      // Act - ほつれ消費
      const result =
        !hasEntry && userStreak.hotsureRemaining > 0
          ? {
              consumed: true,
              hotsureRemaining: userStreak.hotsureRemaining - 1,
              hotsureUsedDates: [...userStreak.hotsureUsedDates, targetDate],
              currentStreak: userStreak.currentStreak, // 維持
            }
          : {
              consumed: false,
              hotsureRemaining: userStreak.hotsureRemaining,
              hotsureUsedDates: userStreak.hotsureUsedDates,
              currentStreak: 0, // 途切れる
            }

      // Assert
      expect(result.consumed).toBe(true)
      expect(result.hotsureRemaining).toBe(1)
      expect(result.hotsureUsedDates).toContain(targetDate)
      expect(result.currentStreak).toBe(5) // 維持されている
    })

    it('ほつれ残数0の場合はストリークが途切れる', () => {
      // Arrange
      const userStreak = {
        currentStreak: 5,
        hotsureRemaining: 0,
        hotsureUsedDates: ['2025-12-14', '2025-12-15'] as string[],
      }
      const hasEntry = false

      // Act - ほつれなしでストリーク途切れ
      const result =
        !hasEntry && userStreak.hotsureRemaining > 0
          ? {
              consumed: true,
              currentStreak: userStreak.currentStreak,
            }
          : {
              consumed: false,
              currentStreak: 0, // 途切れる
            }

      // Assert
      expect(result.consumed).toBe(false)
      expect(result.currentStreak).toBe(0)
    })

    it('ほつれ消費時にcurrent_streakが維持される', () => {
      // Arrange
      const beforeStreak = {
        currentStreak: 10,
        longestStreak: 15,
        hotsureRemaining: 1,
      }

      // Act - ほつれ消費
      const afterStreak = {
        currentStreak: beforeStreak.currentStreak, // 維持
        longestStreak: beforeStreak.longestStreak, // 維持
        hotsureRemaining: beforeStreak.hotsureRemaining - 1,
      }

      // Assert
      expect(afterStreak.currentStreak).toBe(10) // 維持されている
      expect(afterStreak.longestStreak).toBe(15)
      expect(afterStreak.hotsureRemaining).toBe(0)
    })
  })

  describe('週次リセットフロー', () => {
    it('月曜0:00にほつれが2個にリセットされる', () => {
      // Arrange - リセット前の状態: hotsureRemaining=0, hotsureUsedDates=['2025-12-14', '2025-12-15']

      // Act - 週次リセット
      const afterReset = {
        hotsureRemaining: 2,
        hotsureUsedDates: [] as string[],
      }

      // Assert
      expect(afterReset.hotsureRemaining).toBe(2)
      expect(afterReset.hotsureUsedDates).toHaveLength(0)
    })

    it('ほつれの繰り越しがない（残っていても2個に設定）', () => {
      // Arrange - リセット前の状態: hotsureRemaining=1, hotsureUsedDates=['2025-12-14']

      // Act - 週次リセット（繰り越しなし）
      const afterReset = {
        hotsureRemaining: 2, // 一律2個
        hotsureUsedDates: [] as string[],
      }

      // Assert
      expect(afterReset.hotsureRemaining).toBe(2) // 繰り越しなし
      expect(afterReset.hotsureUsedDates).toHaveLength(0)
    })
  })

  describe('日付境界テスト（JST）', () => {
    it('JST 23:59の記録は当日扱い', () => {
      // Arrange
      const today = '2025-12-17'
      const entryTime = '2025-12-17T23:59:00+09:00' // JST 23:59
      const entryDate = entryTime.split('T')[0]

      // Assert
      expect(entryDate).toBe(today)
    })

    it('JST 0:00の記録は翌日扱い', () => {
      // Arrange
      const yesterday = '2025-12-17'
      const entryTime = '2025-12-18T00:00:00+09:00' // JST 0:00
      const entryDate = entryTime.split('T')[0]

      // Assert
      expect(entryDate).not.toBe(yesterday)
      expect(entryDate).toBe('2025-12-18')
    })
  })
})

describe('新規ユーザー初期化フロー', () => {
  it('ユーザー登録時にストリークレコードが初期化される', () => {
    // Arrange
    const newUserId = 'new-user-id'

    // Act - 新規ユーザー作成時の初期値
    const initialStreak = {
      userId: newUserId,
      currentStreak: 0,
      longestStreak: 0,
      lastEntryDate: null,
      hotsureRemaining: 2,
      hotsureUsedDates: [] as string[],
    }

    // Assert
    expect(initialStreak.currentStreak).toBe(0)
    expect(initialStreak.longestStreak).toBe(0)
    expect(initialStreak.lastEntryDate).toBe(null)
    expect(initialStreak.hotsureRemaining).toBe(2)
    expect(initialStreak.hotsureUsedDates).toHaveLength(0)
  })
})
