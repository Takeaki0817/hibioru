import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  getDailyEntryCount,
  getDailyImageCount,
  checkDailyEntryLimit,
  checkDailyImageLimit,
} from '../daily-limits'

// Supabaseクライアントのモック
jest.mock('@/lib/supabase/server')

// JST日付ユーティリティのモック
jest.mock('@/lib/date-utils')

import { createClient } from '@/lib/supabase/server'
import { getJSTDayBounds } from '@/lib/date-utils'
import { DAILY_ENTRY_LIMIT, DAILY_IMAGE_LIMIT } from '../../constants'

describe('entry/api/daily-limits.ts', () => {
  const mockSupabase = {
    from: jest.fn(),
  }

  const mockStart = new Date('2026-01-17T00:00:00Z')
  const mockEnd = new Date('2026-01-18T00:00:00Z')

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
    ;(getJSTDayBounds as any).mockReturnValue({ start: mockStart, end: mockEnd })
  })

  describe('getDailyEntryCount', () => {
    it('正常系: 当日のエントリ件数を取得', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: 5, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await getDailyEntryCount(userId)

      // Assert
      expect(result).toBe(5)
      expect(mockSupabase.from).toHaveBeenCalledWith('entries')
      expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
      expect(mockEq1).toHaveBeenCalledWith('user_id', userId)
      expect(mockEq2).toHaveBeenCalledWith('is_deleted', false)
    })

    it('DB失敗: エラーが発生した場合は0を返す', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: null, error: new Error('DB Error') })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await getDailyEntryCount(userId)

      // Assert
      expect(result).toBe(0)
    })

    it('例外: 予期しない例外が発生した場合は0を返す', async () => {
      // Arrange
      const userId = 'user-123'
      ;(createClient as any).mockRejectedValue(new Error('Connection failed'))

      // Act
      const result = await getDailyEntryCount(userId)

      // Assert
      expect(result).toBe(0)
    })
  })

  describe('getDailyImageCount', () => {
    it('正常系: 当日の画像付きエントリ件数を取得', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: 3, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        not: mockNot,
      })
      mockNot.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await getDailyImageCount(userId)

      // Assert
      expect(result).toBe(3)
      expect(mockNot).toHaveBeenCalledWith('image_urls', 'is', null)
    })

    it('DB失敗: エラーが発生した場合は0を返す', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: null, error: new Error('DB Error') })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        not: mockNot,
      })
      mockNot.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await getDailyImageCount(userId)

      // Assert
      expect(result).toBe(0)
    })
  })

  describe('checkDailyEntryLimit', () => {
    it('正常系: 制限内（5件投稿済み、制限15件）', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: 5, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await checkDailyEntryLimit(userId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value.allowed).toBe(true)
      expect(result.value.current).toBe(5)
      expect(result.value.limit).toBe(DAILY_ENTRY_LIMIT)
      expect(result.value.remaining).toBe(DAILY_ENTRY_LIMIT - 5)
    })

    it('制限到達: 15件投稿済み（制限15件）', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: DAILY_ENTRY_LIMIT, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await checkDailyEntryLimit(userId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value.allowed).toBe(false)
      expect(result.value.current).toBe(DAILY_ENTRY_LIMIT)
      expect(result.value.remaining).toBe(0)
    })

    it('DB_ERROR: エラーが発生した場合', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: null, error: new Error('DB Connection Error') })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await checkDailyEntryLimit(userId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('DB_ERROR')
    })
  })

  describe('checkDailyImageLimit', () => {
    it('正常系: 制限内（3枚アップロード済み、制限5枚）', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: 3, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        not: mockNot,
      })
      mockNot.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await checkDailyImageLimit(userId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value.allowed).toBe(true)
      expect(result.value.current).toBe(3)
      expect(result.value.limit).toBe(DAILY_IMAGE_LIMIT)
      expect(result.value.remaining).toBe(DAILY_IMAGE_LIMIT - 3)
    })

    it('制限超過: 5枚以上アップロード済み（制限5枚）', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: DAILY_IMAGE_LIMIT, error: null })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        not: mockNot,
      })
      mockNot.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await checkDailyImageLimit(userId)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.value.allowed).toBe(false)
      expect(result.value.current).toBe(DAILY_IMAGE_LIMIT)
      expect(result.value.remaining).toBe(0)
    })

    it('DB_ERROR: エラーが発生した場合', async () => {
      // Arrange
      const userId = 'user-123'
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockNot = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockResolvedValue({ count: null, error: new Error('DB Connection Error') })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq1,
      })
      mockEq1.mockReturnValue({
        eq: mockEq2,
      })
      mockEq2.mockReturnValue({
        not: mockNot,
      })
      mockNot.mockReturnValue({
        gte: mockGte,
      })
      mockGte.mockReturnValue({
        lt: mockLt,
      })

      // Act
      const result = await checkDailyImageLimit(userId)

      // Assert
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('DB_ERROR')
    })
  })
})
