/**
 * 通知設定サービスのテスト
 * @jest-environment node
 */

import { getNotificationSettings, updateNotificationSettings } from '../service'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_REMINDERS } from '../../types'

// モック設定
jest.mock('@/lib/supabase/server')
const mockCreateClient = jest.mocked(createClient)

describe('notification/service', () => {
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotificationSettings', () => {
    // チェーンモックを作成するヘルパー関数
    const createSelectChainMock = (finalResult: { data: unknown; error: unknown }) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(finalResult),
      }
      return {
        from: jest.fn().mockReturnValue(chain),
        auth: { getUser: jest.fn() },
      }
    }

    describe('正常系', () => {
      it('通知設定を正常に取得できること', async () => {
        // Arrange
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: DEFAULT_REMINDERS,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createSelectChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.user_id).toBe(mockUserId)
          expect(result.value.enabled).toBe(true)
          expect(result.value.reminders).toEqual(DEFAULT_REMINDERS)
        }
      })

      it('レコードが存在しない場合はデフォルト値を返すこと', async () => {
        // Arrange - PGRST116 はレコードが見つからないエラーコード
        const mockClient = createSelectChainMock({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.user_id).toBe(mockUserId)
          expect(result.value.enabled).toBe(false) // デフォルトはfalse
          expect(result.value.reminders).toEqual(DEFAULT_REMINDERS)
          expect(result.value.chase_reminder_enabled).toBe(true)
          expect(result.value.chase_reminder_delay_minutes).toBe(60)
          expect(result.value.follow_up_max_count).toBe(2)
          expect(result.value.social_notifications_enabled).toBe(true)
        }
      })

      it('remindersがない古いデータにはデフォルト値を付与すること', async () => {
        // Arrange
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: null, // 古いデータでremindersがない
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createSelectChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.reminders).toEqual(DEFAULT_REMINDERS)
        }
      })

      it('remindersが5つ未満の場合はデフォルトで埋めること', async () => {
        // Arrange - 3つのみ設定されている
        const partialReminders = [
          { time: '09:00', enabled: true },
          { time: '12:00', enabled: true },
          { time: '18:00', enabled: true },
        ]
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: partialReminders,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createSelectChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.reminders.length).toBe(5)
          expect(result.value.reminders[0]).toEqual({ time: '09:00', enabled: true })
          expect(result.value.reminders[3]).toEqual({ time: null, enabled: false })
          expect(result.value.reminders[4]).toEqual({ time: null, enabled: false })
        }
      })
    })

    describe('異常系', () => {
      it('データベースエラー時はDB_ERRORを返すこと', async () => {
        // Arrange
        const mockClient = createSelectChainMock({
          data: null,
          error: { code: 'SOME_ERROR', message: 'Database connection failed' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('DB_ERROR')
          expect(result.error.message).toBe('Database connection failed')
        }
      })

      it('予期しない例外時はDB_ERRORを返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue(new Error('Unexpected error'))

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('DB_ERROR')
          expect(result.error.message).toBe('Unexpected error')
        }
      })

      it('非Errorオブジェクトの例外時は「不明なエラー」を返すこと', async () => {
        // Arrange
        mockCreateClient.mockRejectedValue('string error')

        // Act
        const result = await getNotificationSettings(mockUserId)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('DB_ERROR')
          expect(result.error.message).toBe('不明なエラー')
        }
      })
    })
  })

  describe('updateNotificationSettings', () => {
    // チェーンモックを作成するヘルパー関数
    const createUpsertChainMock = (finalResult: { data: unknown; error: unknown }) => {
      const chain = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(finalResult),
      }
      return {
        from: jest.fn().mockReturnValue(chain),
        auth: { getUser: jest.fn() },
      }
    }

    describe('正常系', () => {
      it('通知設定を正常に更新できること', async () => {
        // Arrange
        const updateData = { enabled: true }
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: DEFAULT_REMINDERS,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createUpsertChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.user_id).toBe(mockUserId)
          expect(result.value.enabled).toBe(true)
        }
      })

      it('複数フィールドを同時に更新できること', async () => {
        // Arrange
        const updateData = {
          enabled: true,
          chase_reminder_enabled: false,
          chase_reminder_delay_minutes: 120,
        }
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: DEFAULT_REMINDERS,
          chase_reminder_enabled: false,
          chase_reminder_delay_minutes: 120,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createUpsertChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.enabled).toBe(true)
          expect(result.value.chase_reminder_enabled).toBe(false)
          expect(result.value.chase_reminder_delay_minutes).toBe(120)
        }
      })

      it('remindersを更新できること', async () => {
        // Arrange
        const newReminders = [
          { time: '08:00', enabled: true },
          { time: '12:00', enabled: true },
          { time: '18:00', enabled: true },
          { time: '21:00', enabled: true },
          { time: null, enabled: false },
        ]
        const updateData = { reminders: newReminders }
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: newReminders,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createUpsertChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.reminders).toEqual(newReminders)
        }
      })
    })

    describe('異常系', () => {
      it('データベースエラー時はDB_ERRORを返すこと', async () => {
        // Arrange
        const updateData = { enabled: true }
        const mockClient = createUpsertChainMock({
          data: null,
          error: { code: 'SOME_ERROR', message: 'Upsert failed' },
        })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('DB_ERROR')
          expect(result.error.message).toBe('Upsert failed')
        }
      })

      it('予期しない例外時はDB_ERRORを返すこと', async () => {
        // Arrange
        const updateData = { enabled: true }
        mockCreateClient.mockRejectedValue(new Error('Connection timeout'))

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.code).toBe('DB_ERROR')
          expect(result.error.message).toBe('Connection timeout')
        }
      })
    })

    describe('境界値', () => {
      it('空のupdateデータでも更新できること', async () => {
        // Arrange - 空オブジェクトで更新（user_idのみ設定される）
        const updateData = {}
        const mockSettings = {
          user_id: mockUserId,
          enabled: false,
          reminders: DEFAULT_REMINDERS,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 2,
          social_notifications_enabled: true,
        }
        const mockClient = createUpsertChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.user_id).toBe(mockUserId)
        }
      })

      it('follow_up_max_countを最小値1に設定できること', async () => {
        // Arrange
        const updateData = { follow_up_max_count: 1 }
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: DEFAULT_REMINDERS,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 1,
          social_notifications_enabled: true,
        }
        const mockClient = createUpsertChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.follow_up_max_count).toBe(1)
        }
      })

      it('follow_up_max_countを最大値5に設定できること', async () => {
        // Arrange
        const updateData = { follow_up_max_count: 5 }
        const mockSettings = {
          user_id: mockUserId,
          enabled: true,
          reminders: DEFAULT_REMINDERS,
          chase_reminder_enabled: true,
          chase_reminder_delay_minutes: 60,
          follow_up_max_count: 5,
          social_notifications_enabled: true,
        }
        const mockClient = createUpsertChainMock({ data: mockSettings, error: null })
        mockCreateClient.mockResolvedValue(mockClient)

        // Act
        const result = await updateNotificationSettings(mockUserId, updateData)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.follow_up_max_count).toBe(5)
        }
      })
    })
  })
})
