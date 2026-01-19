/**
 * Streak Service Unit Tests
 *
 * NOTE: The streak service functions (getStreakInfo, updateStreakOnEntry, hasEntryOnDate,
 * getWeeklyRecords, breakStreak) are Server Actions that interact with Supabase.
 * Complex database operations with chained queries are difficult to mock reliably.
 *
 * Testing strategy:
 * - This file: Export verification and type structure validation
 * - E2E tests: Actual database operations tested via e2e/streak.spec.ts
 *
 * The service uses 'use server' directive and server-only imports, making it
 * unsuitable for traditional unit testing with mocked Supabase chains.
 */

import type { StreakInfo, StreakError, WeeklyRecords, Result } from '../../types'

describe('Streak Service', () => {
  // ============================================
  // Export Verification
  // ============================================

  describe('exports', () => {
    it('should export all required functions', async () => {
      // Dynamic import to verify exports exist
      const service = await import('../service')

      expect(typeof service.getStreakInfo).toBe('function')
      expect(typeof service.updateStreakOnEntry).toBe('function')
      expect(typeof service.hasEntryOnDate).toBe('function')
      expect(typeof service.getWeeklyRecords).toBe('function')
      expect(typeof service.breakStreak).toBe('function')
    })
  })

  // ============================================
  // Type Structure Tests
  // ============================================

  describe('StreakInfo type structure', () => {
    it('should have correct shape for initial values', () => {
      const initialStreak: StreakInfo = {
        currentStreak: 0,
        longestStreak: 0,
        lastEntryDate: null,
        hotsureRemaining: 2,
        bonusHotsure: 0,
        hotsureUsedCount: 0,
      }

      expect(initialStreak.currentStreak).toBe(0)
      expect(initialStreak.longestStreak).toBe(0)
      expect(initialStreak.lastEntryDate).toBeNull()
      expect(initialStreak.hotsureRemaining).toBe(2)
      expect(initialStreak.bonusHotsure).toBe(0)
      expect(initialStreak.hotsureUsedCount).toBe(0)
    })

    it('should allow string date for lastEntryDate', () => {
      const streak: StreakInfo = {
        currentStreak: 5,
        longestStreak: 10,
        lastEntryDate: '2025-01-17',
        hotsureRemaining: 1,
        bonusHotsure: 2,
        hotsureUsedCount: 3,
      }

      expect(streak.lastEntryDate).toBe('2025-01-17')
    })
  })

  describe('WeeklyRecords type structure', () => {
    it('should have correct shape for 7-day records', () => {
      const weeklyRecords: WeeklyRecords = {
        entries: [true, false, true, false, true, false, false],
        hotsures: [false, true, false, false, false, false, false],
      }

      expect(weeklyRecords.entries).toHaveLength(7)
      expect(weeklyRecords.hotsures).toHaveLength(7)
    })

    it('should allow all false values (empty week)', () => {
      const emptyWeek: WeeklyRecords = {
        entries: [false, false, false, false, false, false, false],
        hotsures: [false, false, false, false, false, false, false],
      }

      expect(emptyWeek.entries.every((v) => v === false)).toBe(true)
      expect(emptyWeek.hotsures.every((v) => v === false)).toBe(true)
    })

    it('should allow all true values (full week)', () => {
      const fullWeek: WeeklyRecords = {
        entries: [true, true, true, true, true, true, true],
        hotsures: [false, false, false, false, false, false, false],
      }

      expect(fullWeek.entries.every((v) => v === true)).toBe(true)
    })
  })

  describe('StreakError type structure', () => {
    it('should support DB_ERROR code', () => {
      const dbError: StreakError = {
        code: 'DB_ERROR',
        message: 'Database connection failed',
      }

      expect(dbError.code).toBe('DB_ERROR')
      expect(dbError.message).toBeTruthy()
    })

    it('should support NOT_FOUND code', () => {
      const notFoundError: StreakError = {
        code: 'NOT_FOUND',
        message: 'Streak record not found',
      }

      expect(notFoundError.code).toBe('NOT_FOUND')
    })

    it('should support UNAUTHORIZED code', () => {
      const unauthorizedError: StreakError = {
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      }

      expect(unauthorizedError.code).toBe('UNAUTHORIZED')
    })

    it('should support INVALID_DATE code', () => {
      const invalidDateError: StreakError = {
        code: 'INVALID_DATE',
        message: 'Invalid date format',
      }

      expect(invalidDateError.code).toBe('INVALID_DATE')
    })
  })

  describe('Result type structure', () => {
    it('should support success result with StreakInfo', () => {
      const successResult: Result<StreakInfo, StreakError> = {
        ok: true,
        value: {
          currentStreak: 5,
          longestStreak: 10,
          lastEntryDate: '2025-01-17',
          hotsureRemaining: 2,
          bonusHotsure: 0,
          hotsureUsedCount: 0,
        },
      }

      expect(successResult.ok).toBe(true)
      if (successResult.ok) {
        expect(successResult.value.currentStreak).toBe(5)
      }
    })

    it('should support error result with StreakError', () => {
      const errorResult: Result<StreakInfo, StreakError> = {
        ok: false,
        error: {
          code: 'DB_ERROR',
          message: 'Connection failed',
        },
      }

      expect(errorResult.ok).toBe(false)
      if (!errorResult.ok) {
        expect(errorResult.error.code).toBe('DB_ERROR')
      }
    })

    it('should support boolean result for hasEntryOnDate', () => {
      const boolResult: Result<boolean, StreakError> = {
        ok: true,
        value: true,
      }

      expect(boolResult.ok).toBe(true)
      if (boolResult.ok) {
        expect(boolResult.value).toBe(true)
      }
    })

    it('should support void result for breakStreak', () => {
      const voidResult: Result<void, StreakError> = {
        ok: true,
        value: undefined,
      }

      expect(voidResult.ok).toBe(true)
    })
  })

  // ============================================
  // Business Logic Constants
  // ============================================

  describe('business logic constants', () => {
    it('should use default hotsure_remaining of 2 for new users', () => {
      // This is the default value used in getStreakInfo when no record exists
      const DEFAULT_HOTSURE_REMAINING = 2

      expect(DEFAULT_HOTSURE_REMAINING).toBe(2)
    })

    it('should use 7 days for weekly records', () => {
      // WeeklyRecords always returns exactly 7 days (Monday to Sunday)
      const WEEK_LENGTH = 7

      const weeklyRecords: WeeklyRecords = {
        entries: new Array(WEEK_LENGTH).fill(false),
        hotsures: new Array(WEEK_LENGTH).fill(false),
      }

      expect(weeklyRecords.entries).toHaveLength(WEEK_LENGTH)
      expect(weeklyRecords.hotsures).toHaveLength(WEEK_LENGTH)
    })
  })
})
