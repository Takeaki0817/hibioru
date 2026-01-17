import { getNotificationSettings, updateNotificationSettings } from '../service'
import type { NotificationSettings } from '../../types'
import { DEFAULT_REMINDERS } from '../../types'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Notification Service', () => {
  const mockUserId = 'test-user-123'

  const mockSettings: NotificationSettings = {
    user_id: mockUserId,
    enabled: true,
    reminders: [
      { time: '10:00', enabled: true },
      { time: '14:00', enabled: true },
      { time: null, enabled: false },
      { time: null, enabled: false },
      { time: null, enabled: false },
    ],
    chase_reminder_enabled: true,
    chase_reminder_delay_minutes: 60,
    follow_up_max_count: 2,
    social_notifications_enabled: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotificationSettings', () => {
    it('既存設定取得', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSettings,
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getNotificationSettings(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual(mockSettings)
        expect(result.value.reminders).toHaveLength(5)
        expect(result.value.enabled).toBe(true)
      }
      expect(mockFrom).toHaveBeenCalledWith('notification_settings')
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId)
    })

    it('デフォルト値返却 (PGRST116エラー)', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getNotificationSettings(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.user_id).toBe(mockUserId)
        expect(result.value.enabled).toBe(false)
        expect(result.value.reminders).toEqual(DEFAULT_REMINDERS)
        expect(result.value.chase_reminder_enabled).toBe(true)
        expect(result.value.follow_up_max_count).toBe(2)
      }
    })

    it('reminders補完 (5要素未満の場合)', async () => {
      // Arrange
      const settingsWithTwoReminders: NotificationSettings = {
        user_id: mockUserId,
        enabled: true,
        reminders: [
          { time: '10:00', enabled: true },
          { time: '14:00', enabled: true },
        ],
        chase_reminder_enabled: true,
        chase_reminder_delay_minutes: 60,
        follow_up_max_count: 2,
        social_notifications_enabled: true,
      }

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: settingsWithTwoReminders,
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getNotificationSettings(mockUserId)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.reminders).toHaveLength(5)
        expect(result.value.reminders[2]).toEqual({ time: null, enabled: false })
        expect(result.value.reminders[3]).toEqual({ time: null, enabled: false })
        expect(result.value.reminders[4]).toEqual({ time: null, enabled: false })
      }
    })

    it('DB接続エラー', async () => {
      // Arrange
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Connection failed' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        eq: mockEq,
      })

      mockEq.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await getNotificationSettings(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
        expect(result.error.message).toBe('Connection failed')
      }
    })
  })

  describe('updateNotificationSettings', () => {
    it('新規作成', async () => {
      // Arrange
      const mockUpsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockSettings,
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      })

      mockUpsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const updateData = {
        enabled: true,
        reminders: [
          { time: '10:00', enabled: true },
          { time: null, enabled: false },
          { time: null, enabled: false },
          { time: null, enabled: false },
          { time: null, enabled: false },
        ],
      }
      const result = await updateNotificationSettings(mockUserId, updateData)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.user_id).toBe(mockUserId)
        expect(result.value.enabled).toBe(true)
      }
      expect(mockFrom).toHaveBeenCalledWith('notification_settings')
      expect(mockUpsert).toHaveBeenCalled()
    })

    it('既存更新', async () => {
      // Arrange
      const updatedSettings: NotificationSettings = {
        ...mockSettings,
        enabled: false,
      }

      const mockUpsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: updatedSettings,
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      })

      mockUpsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const updateData = { enabled: false }
      const result = await updateNotificationSettings(mockUserId, updateData)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.enabled).toBe(false)
      }
    })

    it('部分更新', async () => {
      // Arrange
      const partialUpdatedSettings: NotificationSettings = {
        ...mockSettings,
        social_notifications_enabled: false,
      }

      const mockUpsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: partialUpdatedSettings,
        error: null,
      })

      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      })

      mockUpsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await updateNotificationSettings(mockUserId, {
        social_notifications_enabled: false,
      })

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.social_notifications_enabled).toBe(false)
      }
    })

    it('DB更新エラー', async () => {
      // Arrange
      const mockUpsert = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Update failed' },
      })

      const mockFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      })

      mockUpsert.mockReturnValue({
        select: mockSelect,
      })

      mockSelect.mockReturnValue({
        single: mockSingle,
      })

      (createClient as jest.Mock).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const result = await updateNotificationSettings(mockUserId, {
        enabled: true,
      })

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
      }
    })
  })
})
