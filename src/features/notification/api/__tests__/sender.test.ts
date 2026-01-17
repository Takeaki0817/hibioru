import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendNotification, sendToAllDevices, getCurrentDayOfWeek, isTimeToSendNotification, shouldSkipNotification } from '../sender'
import type { PushNotificationPayload, PushSubscriptionInfo } from '@/lib/push/types'

// ライブラリのモック
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}))

vi.mock('@/lib/push/subscription', () => ({
  getSubscriptions: vi.fn(),
  removeInvalidSubscription: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('../log', () => ({
  logNotification: vi.fn(),
}))

import webpush from 'web-push'
import { getSubscriptions, removeInvalidSubscription } from '@/lib/push/subscription'
import { createClient } from '@/lib/supabase/server'

describe('Notification Sender', () => {
  const mockUserId = 'test-user-123'
  const mockSubscription: PushSubscriptionInfo = {
    id: 'sub-123',
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    p256dhKey: 'base64-key',
    authKey: 'base64-auth',
  }

  const mockPayload: PushNotificationPayload = {
    title: 'ヒビオル',
    body: '今日の記録を残しましょう',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      url: '/',
      type: 'main_reminder',
      notificationId: 'notif-123',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // 環境変数を設定
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key'
    process.env.VAPID_PRIVATE_KEY = 'test-private-key'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentDayOfWeek', () => {
    it('タイムゾーン考慮した曜日取得 - 月曜日', () => {
      // Arrange
      const testDate = new Date('2025-01-20T12:00:00Z') // 月曜日

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(1) // 1 = Monday
    })

    it('タイムゾーン考慮した曜日取得 - 日曜日', () => {
      // Arrange
      const testDate = new Date('2025-01-19T12:00:00Z') // 日曜日

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(0) // 0 = Sunday
    })

    it('タイムゾーン考慮した曜日取得 - 土曜日', () => {
      // Arrange
      const testDate = new Date('2025-01-18T12:00:00Z') // 土曜日

      // Act
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', testDate)

      // Assert
      expect(dayOfWeek).toBe(6) // 6 = Saturday
    })
  })

  describe('isTimeToSendNotification', () => {
    it('時刻と曜日が一致する場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z') // 月曜日10:00 UTC
      // 注: Asia/Tokyoでは UTC+9なため、UTC 10:00 = JST 19:00
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1], // 月曜日
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
      const testDate = new Date('2025-01-20T10:00:00Z') // 月曜日
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [3, 5], // 水曜日と金曜日
      }

      // Act
      const shouldSend = isTimeToSendNotification(settings, testDate)

      // Assert
      expect(shouldSend).toBe(false)
    })

    it('複数の有効な曜日が指定されている場合', () => {
      // Arrange
      const testDate = new Date('2025-01-20T10:00:00Z') // 月曜日
      const settings = {
        primaryTime: '19:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1, 3, 5], // 月・水・金曜日
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
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockEq3 = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLt = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue({
        data: [{ id: 'entry-123' }],
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification(mockUserId, testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(true) // スキップすべき
      }
    })

    it('その日のエントリーが存在しない場合はスキップしない', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLt = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const mockFrom = vi.fn().mockReturnValue({
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

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification(mockUserId, testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(false) // スキップしない
      }
    })

    it('DB接続エラー時', async () => {
      // Arrange
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq1 = vi.fn().mockReturnThis()
      const mockEq2 = vi.fn().mockReturnThis()
      const mockGte = vi.fn().mockReturnThis()
      const mockLt = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })

      const mockFrom = vi.fn().mockReturnValue({
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

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as any)

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification(mockUserId, testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Database error')
      }
    })

    it('例外発生時のエラー処理', async () => {
      // Arrange
      vi.mocked(createClient).mockRejectedValue(
        new Error('Unexpected error')
      )

      // Act
      const testDate = new Date('2025-01-20T10:00:00Z')
      const result = await shouldSkipNotification(mockUserId, testDate, 'Asia/Tokyo')

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('Unexpected error')
      }
    })
  })

  describe('sendNotification', () => {
    it('単一デバイスへの送信成功', async () => {
      // Arrange
      vi.mocked(webpush.default.sendNotification).mockResolvedValue({
        statusCode: 201,
      } as any)

      // Act
      const result = await sendNotification(mockSubscription, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.success).toBe(true)
        expect(result.value.statusCode).toBe(201)
        expect(result.value.subscriptionId).toBe('sub-123')
      }
    })

    it('410 Gone エラー時 (無効な購読)', async () => {
      // Arrange
      vi.mocked(webpush.default.sendNotification).mockRejectedValue({
        statusCode: 410,
        message: 'Subscription has expired',
      })

      // Act
      const result = await sendNotification(mockSubscription, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.success).toBe(false)
        expect(result.value.statusCode).toBe(410)
        expect(result.value.shouldRemove).toBe(true)
      }
    })

    it('その他のエラー時', async () => {
      // Arrange
      vi.mocked(webpush.default.sendNotification).mockRejectedValue({
        statusCode: 400,
        message: 'Invalid request',
      })

      // Act
      const result = await sendNotification(mockSubscription, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.success).toBe(false)
        expect(result.value.statusCode).toBe(400)
        expect(result.value.error).toContain('Invalid request')
      }
    })
  })

  describe('sendToAllDevices', () => {
    it('複数デバイスへの送信成功', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        mockSubscription,
        {
          id: 'sub-456',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dhKey: 'key2',
          authKey: 'auth2',
        },
      ]

      vi.mocked(getSubscriptions).mockResolvedValue({
        ok: true,
        value: subscriptions,
      })

      vi.mocked(webpush.default.sendNotification)
        .mockResolvedValueOnce({ statusCode: 201 } as any)
        .mockResolvedValueOnce({ statusCode: 201 } as any)

      // Act
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].success).toBe(true)
        expect(result.value[1].success).toBe(true)
      }
    })

    it('購読情報なし', async () => {
      // Arrange
      vi.mocked(getSubscriptions).mockResolvedValue({
        ok: true,
        value: [],
      })

      // Act
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('NO_SUBSCRIPTIONS')
      }
    })

    it('購読情報取得失敗', async () => {
      // Arrange
      vi.mocked(getSubscriptions).mockResolvedValue({
        ok: false,
        error: { type: 'DATABASE_ERROR', message: 'Database error' },
      })

      // Act
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('VAPID_ERROR')
      }
    })

    it('一部デバイスの送信失敗、一部成功', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        mockSubscription,
        {
          id: 'sub-456',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dhKey: 'key2',
          authKey: 'auth2',
        },
      ]

      vi.mocked(getSubscriptions).mockResolvedValue({
        ok: true,
        value: subscriptions,
      })

      vi.mocked(webpush.default.sendNotification)
        .mockResolvedValueOnce({ statusCode: 201 } as any)
        .mockRejectedValueOnce({
          statusCode: 400,
          message: 'Invalid request',
        })

      // Act
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].success).toBe(true)
        expect(result.value[1].success).toBe(false)
      }
    })

    it('全デバイスの送信失敗', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        mockSubscription,
        {
          id: 'sub-456',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dhKey: 'key2',
          authKey: 'auth2',
        },
      ]

      vi.mocked(getSubscriptions).mockResolvedValue({
        ok: true,
        value: subscriptions,
      })

      vi.mocked(webpush.default.sendNotification)
        .mockRejectedValueOnce({
          statusCode: 400,
          message: 'Invalid request',
        })
        .mockRejectedValueOnce({
          statusCode: 400,
          message: 'Invalid request',
        })

      // Act
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('ALL_FAILED')
        if ('results' in result.error) {
          expect(result.error.results).toHaveLength(2)
          expect(result.error.results[0].success).toBe(false)
          expect(result.error.results[1].success).toBe(false)
        }
      }
    })

    it('無効な購読 (410 Gone) を削除', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        mockSubscription,
        {
          id: 'sub-456',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dhKey: 'key2',
          authKey: 'auth2',
        },
      ]

      vi.mocked(getSubscriptions).mockResolvedValue({
        ok: true,
        value: subscriptions,
      })

      vi.mocked(webpush.default.sendNotification)
        .mockResolvedValueOnce({ statusCode: 201 } as any)
        .mockRejectedValueOnce({
          statusCode: 410,
          message: 'Subscription expired',
        })

      vi.mocked(removeInvalidSubscription).mockResolvedValue({
        ok: true,
        value: undefined,
      })

      // Act
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[1].shouldRemove).toBe(true)
        // 削除関数が呼ばれたことを確認
        expect(removeInvalidSubscription).toHaveBeenCalledWith('sub-456', '410 Gone')
      }
    })
  })
})
