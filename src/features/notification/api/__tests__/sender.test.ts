import { getCurrentDayOfWeek, isTimeToSendNotification, shouldSkipNotification } from '../sender'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Notification Sender', () => {
  describe('getCurrentDayOfWeek', () => {
    it('タイムゾーン考慮した曜日取得 - 月曜日', () => {
      // Arrange
      const testDate = new Date('2025-01-20T12:00:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(1)
    })

    it('タイムゾーン考慮した曜日取得 - 日曜日', () => {
      // Arrange
      const testDate = new Date('2025-01-19T12:00:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(0)
    })

    it('タイムゾーン考慮した曜日取得 - 土曜日', () => {
      // Arrange
      const testDate = new Date('2025-01-18T12:00:00Z')

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(6)
    })
  })

  describe('isTimeToSendNotification', () => {
    it('時刻と曜日が一致する場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(true)
    })

    it('時刻が一致しない場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '18:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(false)
    })

    it('曜日が一致しない場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [3, 5],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(false)
    })

    it('複数の有効な曜日が指定されている場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z')
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1, 3, 5],
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(true)
    })
  })

  describe('shouldSkipNotification', () => {
    it('その日のエントリーが存在する場合はスキップ', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockEq3 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: [{ id: 'entry-123' }],
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
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

      mockLt.mockReturnValue({
        limit: mockLimit,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification('test-user-123', testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(true)
      }
    })

    it('その日のエントリーが存在しない場合はスキップしない', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
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

      mockLt.mockReturnValue({
        limit: mockLimit,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification('test-user-123', testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(false)
      }
    })

    it('DB接続エラー時', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq1 = jest.fn().mockReturnThis()
      const mockEq2 = jest.fn().mockReturnThis()
      const mockGte = jest.fn().mockReturnThis()
      const mockLt = jest.fn().mockReturnThis()
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = jest.fn().mockReturnValue({
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

      mockLt.mockReturnValue({
        limit: mockLimit,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification('test-user-123', testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
      }
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      (createClient as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      )

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification('test-user-123', testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
      }
    })
  })
})
