/**
 * 通知配信サービスのテスト
 * @jest-environment node
 */

import type { PushSubscriptionInfo, PushNotificationPayload } from '@/lib/push/types'

// 実際のモジュールを先にモック
jest.mock('@/lib/supabase/server')
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}))

// VAPID環境変数を設定
const originalEnv = process.env

describe('push/sender', () => {
  const mockSubscription: PushSubscriptionInfo = {
    id: 'sub-123',
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    p256dhKey: 'test-p256dh-key',
    authKey: 'test-auth-key',
  }

  const mockPayload: PushNotificationPayload = {
    title: 'テスト通知',
    body: 'これはテスト通知です',
    icon: '/icon-192.png',
    data: {
      url: '/',
      type: 'main_reminder',
      notificationId: 'notification-123',
    },
  }

  beforeAll(() => {
    // VAPID環境変数を設定
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-public-key-valid',
      VAPID_PRIVATE_KEY: 'test-private-key-valid',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendNotification', () => {
    describe('正常系', () => {
      it('通知を正常に送信できること', async () => {
        // Arrange
        const webpush = await import('web-push')
        const mockWebpush = jest.mocked(webpush)
        mockWebpush.sendNotification.mockResolvedValue({
          statusCode: 201,
          headers: {},
          body: '',
        })

        // Act
        const { sendNotification } = await import('@/lib/push/sender')
        const result = await sendNotification(mockSubscription, mockPayload)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.subscriptionId).toBe('sub-123')
          expect(result.value.success).toBe(true)
          expect(result.value.statusCode).toBe(201)
        }
      })

      it('通知ペイロードがJSON形式で送信されること', async () => {
        // Arrange
        const webpush = await import('web-push')
        const mockWebpush = jest.mocked(webpush)
        mockWebpush.sendNotification.mockResolvedValue({
          statusCode: 201,
          headers: {},
          body: '',
        })

        // Act
        const { sendNotification } = await import('@/lib/push/sender')
        await sendNotification(mockSubscription, mockPayload)

        // Assert
        expect(mockWebpush.sendNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint: mockSubscription.endpoint,
            keys: {
              p256dh: mockSubscription.p256dhKey,
              auth: mockSubscription.authKey,
            },
          }),
          JSON.stringify(mockPayload)
        )
      })
    })

    describe('異常系', () => {
      it('410 Gone エラー時はshouldRemove=trueを返すこと', async () => {
        // Arrange
        const webpush = await import('web-push')
        const mockWebpush = jest.mocked(webpush)
        const goneError = { statusCode: 410, message: 'Gone' }
        mockWebpush.sendNotification.mockRejectedValue(goneError)

        // Act
        const { sendNotification } = await import('@/lib/push/sender')
        const result = await sendNotification(mockSubscription, mockPayload)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.success).toBe(false)
          expect(result.value.statusCode).toBe(410)
          expect(result.value.shouldRemove).toBe(true)
          expect(result.value.error).toBe('Subscription has expired or is no longer valid')
        }
      })

      it('その他のエラー時はエラーメッセージを返すこと', async () => {
        // Arrange
        const webpush = await import('web-push')
        const mockWebpush = jest.mocked(webpush)
        const error = { statusCode: 500, message: 'Network error' }
        mockWebpush.sendNotification.mockRejectedValue(error)

        // Act
        const { sendNotification } = await import('@/lib/push/sender')
        const result = await sendNotification(mockSubscription, mockPayload)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.success).toBe(false)
          expect(result.value.statusCode).toBe(500)
          expect(result.value.error).toBe('Network error')
          expect(result.value.shouldRemove).toBeUndefined()
        }
      })

      it('bodyプロパティを持つエラーからメッセージを取得できること', async () => {
        // Arrange
        const webpush = await import('web-push')
        const mockWebpush = jest.mocked(webpush)
        const error = { statusCode: 400, body: 'Bad request body' }
        mockWebpush.sendNotification.mockRejectedValue(error)

        // Act
        const { sendNotification } = await import('@/lib/push/sender')
        const result = await sendNotification(mockSubscription, mockPayload)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.error).toBe('Bad request body')
        }
      })

      it('statusCodeがないエラーの場合もエラーメッセージを返すこと', async () => {
        // Arrange
        const webpush = await import('web-push')
        const mockWebpush = jest.mocked(webpush)
        const error = { message: 'Unknown error' }
        mockWebpush.sendNotification.mockRejectedValue(error)

        // Act
        const { sendNotification } = await import('@/lib/push/sender')
        const result = await sendNotification(mockSubscription, mockPayload)

        // Assert
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.success).toBe(false)
          expect(result.value.statusCode).toBeUndefined()
          expect(result.value.error).toBe('Unknown error')
        }
      })
    })
  })

  describe('sendNotification VAPID設定エラー', () => {
    // VAPID環境変数未設定のテストは別ブロックで実行
    const savedPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const savedPrivateKey = process.env.VAPID_PRIVATE_KEY

    beforeEach(() => {
      // モジュールキャッシュをリセットしてVAPID設定状態をクリア
      jest.resetModules()
    })

    afterEach(() => {
      // 環境変数を復元
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = savedPublicKey
      process.env.VAPID_PRIVATE_KEY = savedPrivateKey
    })

    it('VAPID公開鍵が未設定の場合はVAPID_ERRORを返すこと', async () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      process.env.VAPID_PRIVATE_KEY = 'test-private-key'

      // モジュールを再モック
      jest.mock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn(),
      }))

      // Act
      const { sendNotification } = await import('@/lib/push/sender')
      const result = await sendNotification(mockSubscription, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('VAPID_ERROR')
        expect(result.error.message).toContain('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      }
    })

    it('VAPID秘密鍵が未設定の場合はVAPID_ERRORを返すこと', async () => {
      // Arrange
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key'
      delete process.env.VAPID_PRIVATE_KEY

      // モジュールを再モック
      jest.mock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn(),
      }))

      // Act
      const { sendNotification } = await import('@/lib/push/sender')
      const result = await sendNotification(mockSubscription, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('VAPID_ERROR')
        expect(result.error.message).toContain('VAPID_PRIVATE_KEY')
      }
    })

    it('VAPID鍵が空文字の場合はVAPID_ERRORを返すこと', async () => {
      // Arrange
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ''
      process.env.VAPID_PRIVATE_KEY = ''

      // モジュールを再モック
      jest.mock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn(),
      }))

      // Act
      const { sendNotification } = await import('@/lib/push/sender')
      const result = await sendNotification(mockSubscription, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('VAPID_ERROR')
      }
    })
  })
})

/**
 * sendToAllDevices のテスト
 * モジュール間の依存関係が複雑なため、別describeで独立してテスト
 */
describe('push/sender sendToAllDevices', () => {
  const mockUserId = 'test-user-123'
  const mockPayload: PushNotificationPayload = {
    title: 'テスト通知',
    body: 'これはテスト通知です',
    data: {
      url: '/',
      type: 'main_reminder',
      notificationId: 'notification-123',
    },
  }

  beforeAll(() => {
    // VAPID環境変数を設定
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key-valid'
    process.env.VAPID_PRIVATE_KEY = 'test-private-key-valid'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    // 各テスト前にモジュールをリセット
    jest.resetModules()
    jest.clearAllMocks()
  })

  describe('異常系', () => {
    it('購読情報の取得に失敗した場合はエラーを返すこと', async () => {
      // Arrange - subscriptionモジュールをモック
      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: false,
          error: { type: 'DATABASE_ERROR', message: 'DB error' },
        }),
        removeInvalidSubscription: jest.fn(),
      }))

      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn(),
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('VAPID_ERROR')
        expect(result.error.message).toBe('Failed to get subscriptions')
      }
    })

    it('購読情報がない場合はNO_SUBSCRIPTIONSを返すこと', async () => {
      // Arrange
      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: true,
          value: [],
        }),
        removeInvalidSubscription: jest.fn(),
      }))

      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn(),
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('NO_SUBSCRIPTIONS')
      }
    })

    it('全デバイスへの送信が失敗した場合はALL_FAILEDを返すこと', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        { id: 'sub-1', endpoint: 'https://endpoint-1', p256dhKey: 'key-1', authKey: 'auth-1' },
        { id: 'sub-2', endpoint: 'https://endpoint-2', p256dhKey: 'key-2', authKey: 'auth-2' },
      ]

      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: true,
          value: subscriptions,
        }),
        removeInvalidSubscription: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
      }))

      // 全て失敗
      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn().mockRejectedValue({ statusCode: 410, message: 'Gone' }),
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.type).toBe('ALL_FAILED')
        if (result.error.type === 'ALL_FAILED') {
          expect(result.error.results.length).toBe(2)
          expect(result.error.results[0].success).toBe(false)
          expect(result.error.results[1].success).toBe(false)
        }
      }
    })
  })

  describe('正常系', () => {
    it('全デバイスへ通知を送信できること', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        { id: 'sub-1', endpoint: 'https://endpoint-1', p256dhKey: 'key-1', authKey: 'auth-1' },
        { id: 'sub-2', endpoint: 'https://endpoint-2', p256dhKey: 'key-2', authKey: 'auth-2' },
      ]

      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: true,
          value: subscriptions,
        }),
        removeInvalidSubscription: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
      }))

      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn().mockResolvedValue({
          statusCode: 201,
          headers: {},
          body: '',
        }),
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.length).toBe(2)
        expect(result.value[0].subscriptionId).toBe('sub-1')
        expect(result.value[0].success).toBe(true)
        expect(result.value[1].subscriptionId).toBe('sub-2')
        expect(result.value[1].success).toBe(true)
      }
    })

    it('一部のデバイスが失敗しても成功結果を返すこと', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        { id: 'sub-1', endpoint: 'https://endpoint-1', p256dhKey: 'key-1', authKey: 'auth-1' },
        { id: 'sub-2', endpoint: 'https://endpoint-2', p256dhKey: 'key-2', authKey: 'auth-2' },
      ]

      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: true,
          value: subscriptions,
        }),
        removeInvalidSubscription: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
      }))

      // 最初は成功、2回目は失敗
      const mockSendNotification = jest.fn()
        .mockResolvedValueOnce({ statusCode: 201, headers: {}, body: '' })
        .mockRejectedValueOnce({ statusCode: 500, message: 'Server error' })

      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: mockSendNotification,
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.length).toBe(2)
        expect(result.value[0].success).toBe(true)
        expect(result.value[1].success).toBe(false)
      }
    })

    it('410 Goneの購読は自動削除されること', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        { id: 'sub-1', endpoint: 'https://endpoint-1', p256dhKey: 'key-1', authKey: 'auth-1' },
      ]

      const mockRemoveInvalidSubscription = jest.fn().mockResolvedValue({ ok: true, value: undefined })
      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: true,
          value: subscriptions,
        }),
        removeInvalidSubscription: mockRemoveInvalidSubscription,
      }))

      // 410 Goneエラー
      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn().mockRejectedValue({ statusCode: 410, message: 'Gone' }),
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      await sendToAllDevices(mockUserId, mockPayload)

      // Assert - removeInvalidSubscriptionが呼ばれる
      expect(mockRemoveInvalidSubscription).toHaveBeenCalledWith('sub-1', '410 Gone')
    })

    it('単一デバイスへの送信が成功すること', async () => {
      // Arrange
      const subscriptions: PushSubscriptionInfo[] = [
        { id: 'sub-1', endpoint: 'https://endpoint-1', p256dhKey: 'key-1', authKey: 'auth-1' },
      ]

      jest.doMock('@/lib/push/subscription', () => ({
        getSubscriptions: jest.fn().mockResolvedValue({
          ok: true,
          value: subscriptions,
        }),
        removeInvalidSubscription: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
      }))

      jest.doMock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn().mockResolvedValue({
          statusCode: 201,
          headers: {},
          body: '',
        }),
      }))

      // Act
      const { sendToAllDevices } = await import('@/lib/push/sender')
      const result = await sendToAllDevices(mockUserId, mockPayload)

      // Assert
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.length).toBe(1)
      }
    })
  })
})
