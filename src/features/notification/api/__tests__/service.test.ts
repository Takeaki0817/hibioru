import { getNotificationSettings, updateNotificationSettings } from '../service'
import type { NotificationSettings } from '../../types'
import { DEFAULT_REMINDERS } from '../../types'

// Supabaseクライアントのモック
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
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockSettings,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const mockFrom = vi.fn().mockReturnValue({
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

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: settingsWithTwoReminders,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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

    it('reminders補完 (remindersがnullの場合)', async () => {
      // Arrange
      const settingsWithNullReminders = {
        user_id: mockUserId,
        enabled: true,
        reminders: null,
        chase_reminder_enabled: true,
        chase_reminder_delay_minutes: 60,
        follow_up_max_count: 2,
        social_notifications_enabled: true,
      }

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: settingsWithNullReminders,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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
        expect(result.value.reminders).toEqual(DEFAULT_REMINDERS)
        expect(result.value.reminders).toHaveLength(5)
      }
    })

    it('DB接続エラー', async () => {
      // Arrange
      const mockError = new Error('Connection failed')
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Connection failed' },
      })

      const mockFrom = vi.fn().mockReturnValue({
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

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected error')
      )

      // Act
      const result = await getNotificationSettings(mockUserId)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
        expect(result.error.message).toBe('Unexpected error')
      }
    })
  })

  describe('updateNotificationSettings', () => {
    it('新規作成', async () => {
      // Arrange
      const mockUpsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockSettings,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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

      const mockUpsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedSettings,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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
        expect(result.value.reminders).toEqual(mockSettings.reminders)
      }
    })

    it('reminders更新', async () => {
      // Arrange
      const newReminders = [
        { time: '09:00', enabled: true },
        { time: '15:00', enabled: true },
        { time: '20:00', enabled: true },
        { time: null, enabled: false },
        { time: null, enabled: false },
      ]

      const updatedSettings: NotificationSettings = {
        ...mockSettings,
        reminders: newReminders,
      }

      const mockUpsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: updatedSettings,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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
        reminders: newReminders,
      })

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.reminders).toEqual(newReminders)
        expect(result.value.reminders[0].time).toBe('09:00')
        expect(result.value.reminders[1].time).toBe('15:00')
      }
    })

    it('部分更新', async () => {
      // Arrange
      const partialUpdatedSettings: NotificationSettings = {
        ...mockSettings,
        enabled: true,
        social_notifications_enabled: false,
      }

      const mockUpsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: partialUpdatedSettings,
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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
        expect(result.value.enabled).toBe(true)
        expect(result.value.reminders).toEqual(mockSettings.reminders)
      }
    })

    it('DB更新エラー', async () => {
      // Arrange
      const mockUpsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Update failed' },
      })

      const mockFrom = vi.fn().mockReturnValue({
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
        expect(result.error.message).toBe('Update failed')
      }
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected error during update')
      )

      // Act
      const result = await updateNotificationSettings(mockUserId, {
        enabled: true,
      })

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DB_ERROR')
        expect(result.error.message).toBe('Unexpected error during update')
      }
    })
  })
})
