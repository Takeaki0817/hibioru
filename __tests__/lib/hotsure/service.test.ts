/**
 * ほつれサービスのユニットテスト
 * TDD方式: テストファースト、実装、リファクタリング
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// モックのSupabaseクライアント
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
}

// Supabaseクライアント作成関数をモック
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

describe('HotsureService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getHotsureInfo', () => {
    it('ほつれ情報を正しく取得できる', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockData = {
        hotsure_remaining: 1,
        hotsure_used_dates: ['2025-12-15'],
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const { getHotsureInfo } = await import('@/features/hotsure/api/service')

      // Act
      const result = await getHotsureInfo(userId)

      // Assert
      expect(result).not.toBeNull()
      if (result) {
        expect(result.remaining).toBe(1)
        expect(result.usedDates).toEqual(['2025-12-15'])
        expect(result.maxPerWeek).toBe(2)
      }
    })

    it('レコードが存在しない場合はnullを返す', async () => {
      // Arrange
      const userId = 'new-user-id'

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const { getHotsureInfo } = await import('@/features/hotsure/api/service')

      // Act
      const result = await getHotsureInfo(userId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('canUseHotsure', () => {
    it('ほつれが残っている場合はtrueを返す', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockData = {
        hotsure_remaining: 2,
        hotsure_used_dates: [],
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const { canUseHotsure } = await import('@/features/hotsure/api/service')

      // Act
      const result = await canUseHotsure(userId)

      // Assert
      expect(result).toBe(true)
    })

    it('ほつれが残っていない場合はfalseを返す', async () => {
      // Arrange
      const userId = 'test-user-id'
      const mockData = {
        hotsure_remaining: 0,
        hotsure_used_dates: [],
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const { canUseHotsure } = await import('@/features/hotsure/api/service')

      // Act
      const result = await canUseHotsure(userId)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('consumeHotsure', () => {
    it('ほつれが正常に消費される', async () => {
      // Arrange
      const userId = 'test-user-id'

      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          remaining: 1,
          used_date: '2025-12-17',
        },
        error: null,
      })

      const { consumeHotsure } = await import('@/features/hotsure/api/service')

      // Act
      const result = await consumeHotsure(userId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('consume_hotsure', {
        p_user_id: userId,
      })
    })

    it('ほつれが残っていない場合は失敗する', async () => {
      // Arrange
      const userId = 'test-user-id'

      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: false,
          error: 'No hotsure remaining',
        },
        error: null,
      })

      const { consumeHotsure } = await import('@/features/hotsure/api/service')

      // Act
      const result = await consumeHotsure(userId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('No hotsure remaining')
    })
  })

  describe('resetHotsureWeekly', () => {
    it('週次リセットが正常に実行される', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          success: true,
          affected_users: 100,
        },
        error: null,
      })

      const { resetHotsureWeekly } = await import('@/features/hotsure/api/service')

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result.success).toBe(true)
      expect(result.affectedUsers).toBe(100)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('reset_hotsure_weekly')
    })

    it('エラー時は失敗結果を返す', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const { resetHotsureWeekly } = await import('@/features/hotsure/api/service')

      // Act
      const result = await resetHotsureWeekly()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })
})
