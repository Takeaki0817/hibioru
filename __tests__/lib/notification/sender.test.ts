/**
 * 通知配信サービスのテスト
 *
 * NotificationDispatcher / NotificationSenderの機能をテストします:
 * - 7.1: 通知送信処理（web-push使用、全デバイス送信、送信結果収集）
 * - 7.2: タイムゾーン対応の配信時刻計算
 * - 7.3: 記録済みユーザーのスキップ判定
 */

import {
  sendNotification,
  sendToAllDevices,
  shouldSkipNotification,
  isTimeToSendNotification,
  getCurrentDayOfWeek,
  type SendResult,
  type NotificationPayload,
  type DispatchError,
} from '@/features/notification/api/sender';

// web-pushライブラリのモック
const mockSendNotification = jest.fn();
jest.mock('web-push', () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  setVapidDetails: jest.fn(),
}));

// 購読サービスのモック
const mockGetSubscriptions = jest.fn();
jest.mock('@/features/notification/api/subscription', () => ({
  getSubscriptions: (...args: unknown[]) => mockGetSubscriptions(...args),
  removeInvalidSubscription: jest.fn().mockResolvedValue({ ok: true, value: undefined }),
}));

// ログサービスのモック
const mockLogNotification = jest.fn();
jest.mock('@/features/notification/api/log', () => ({
  logNotification: (...args: unknown[]) => mockLogNotification(...args),
}));

// VAPID設定のモック
jest.mock('@/features/notification/config', () => ({
  getVapidConfig: jest.fn().mockReturnValue({
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
  }),
  validateVapidConfig: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
  }),
}));

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: jest.fn(),
};
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('NotificationSender', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogNotification.mockResolvedValue({ ok: true, value: {} });
  });

  describe('sendNotification (タスク7.1)', () => {
    const validUserId = 'user-123';
    const validSubscription = {
      id: 'sub-1',
      userId: validUserId,
      endpoint: 'https://push.example.com/subscription/abc123',
      p256dhKey: 'BPnJfbEFvA1KjXz...',
      authKey: 'auth-key-123',
      userAgent: 'Chrome',
      createdAt: new Date('2025-12-18T00:00:00Z'),
    };
    const validPayload: NotificationPayload = {
      title: 'ヒビオル',
      body: '今日はどんな一日だった？',
      icon: '/icons/icon-192x192.png',
      data: {
        url: '/',
        type: 'main',
        notificationId: 'notif-123',
      },
    };

    it('単一デバイスへの通知送信が成功する', async () => {
      // Given: web-pushが成功を返す
      mockSendNotification.mockResolvedValue({
        statusCode: 201,
        body: '',
        headers: {},
      });

      // When: 通知を送信
      const result = await sendNotification(validSubscription, validPayload);

      // Then: 成功結果を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.subscriptionId).toBe('sub-1');
        expect(result.value.success).toBe(true);
        expect(result.value.statusCode).toBe(201);
      }
    });

    it('410 Goneエラーを検出して購読削除をマークする', async () => {
      // Given: Push Serviceが410 Goneを返す（購読が無効）
      mockSendNotification.mockRejectedValue({
        statusCode: 410,
        body: 'Gone',
      });

      // When: 通知を送信
      const result = await sendNotification(validSubscription, validPayload);

      // Then: エラー結果を返し、削除が必要なことを示す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(false);
        expect(result.value.statusCode).toBe(410);
        expect(result.value.shouldRemove).toBe(true);
      }
    });

    it('その他のエラーを適切にハンドリングする', async () => {
      // Given: Push Serviceがエラーを返す
      mockSendNotification.mockRejectedValue(new Error('Network error'));

      // When: 通知を送信
      const result = await sendNotification(validSubscription, validPayload);

      // Then: エラー結果を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('Network error');
      }
    });
  });

  describe('sendToAllDevices (タスク7.1)', () => {
    const validUserId = 'user-123';
    const validPayload: NotificationPayload = {
      title: 'ヒビオル',
      body: '今日はどんな一日だった？',
      data: {
        url: '/',
        type: 'main',
        notificationId: 'notif-123',
      },
    };

    it('全登録デバイスへの一斉送信が成功する', async () => {
      // Given: ユーザーに複数デバイスが登録されている
      const subscriptions = [
        {
          id: 'sub-1',
          userId: validUserId,
          endpoint: 'https://push.example.com/1',
          p256dhKey: 'key1',
          authKey: 'auth1',
          userAgent: 'Chrome',
          createdAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: validUserId,
          endpoint: 'https://push.example.com/2',
          p256dhKey: 'key2',
          authKey: 'auth2',
          userAgent: 'Safari',
          createdAt: new Date(),
        },
      ];
      mockGetSubscriptions.mockResolvedValue({ ok: true, value: subscriptions });
      mockSendNotification.mockResolvedValue({ statusCode: 201 });

      // When: 全デバイスに通知を送信
      const result = await sendToAllDevices(validUserId, validPayload);

      // Then: 全デバイスへの送信結果を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].success).toBe(true);
        expect(result.value[1].success).toBe(true);
      }
    });

    it('購読情報がない場合はNO_SUBSCRIPTIONSエラーを返す', async () => {
      // Given: ユーザーに購読情報がない
      mockGetSubscriptions.mockResolvedValue({ ok: true, value: [] });

      // When: 全デバイスに通知を送信
      const result = await sendToAllDevices(validUserId, validPayload);

      // Then: エラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NO_SUBSCRIPTIONS');
      }
    });

    it('全デバイスへの送信が失敗した場合はALL_FAILEDエラーを返す', async () => {
      // Given: 全デバイスへの送信が失敗
      mockGetSubscriptions.mockResolvedValue({
        ok: true,
        value: [
          {
            id: 'sub-1',
            userId: validUserId,
            endpoint: 'https://push.example.com/1',
            p256dhKey: 'key1',
            authKey: 'auth1',
            userAgent: null,
            createdAt: new Date(),
          },
        ],
      });
      mockSendNotification.mockRejectedValue(new Error('All failed'));

      // When: 全デバイスに通知を送信
      const result = await sendToAllDevices(validUserId, validPayload);

      // Then: 全失敗エラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALL_FAILED');
      }
    });

    it('部分的な成功の場合は成功として扱う', async () => {
      // Given: 一部のデバイスのみ成功
      mockGetSubscriptions.mockResolvedValue({
        ok: true,
        value: [
          {
            id: 'sub-1',
            userId: validUserId,
            endpoint: 'https://push.example.com/1',
            p256dhKey: 'key1',
            authKey: 'auth1',
            userAgent: null,
            createdAt: new Date(),
          },
          {
            id: 'sub-2',
            userId: validUserId,
            endpoint: 'https://push.example.com/2',
            p256dhKey: 'key2',
            authKey: 'auth2',
            userAgent: null,
            createdAt: new Date(),
          },
        ],
      });
      mockSendNotification
        .mockResolvedValueOnce({ statusCode: 201 })
        .mockRejectedValueOnce(new Error('Failed'));

      // When: 全デバイスに通知を送信
      const result = await sendToAllDevices(validUserId, validPayload);

      // Then: 部分的成功として扱う
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].success).toBe(true);
        expect(result.value[1].success).toBe(false);
      }
    });
  });

  describe('isTimeToSendNotification (タスク7.2)', () => {
    it('現在時刻がprimaryTimeと一致する場合trueを返す', () => {
      // Given: primaryTimeが21:00、現在が21:00
      const settings = {
        primaryTime: '21:00',
        timezone: 'Asia/Tokyo',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
      };
      // 2025-12-18 21:00 JST
      const currentTime = new Date('2025-12-18T12:00:00Z');

      // When: 配信時刻を判定
      const result = isTimeToSendNotification(settings, currentTime);

      // Then: trueを返す
      expect(result).toBe(true);
    });

    it('現在時刻がprimaryTimeと異なる場合falseを返す', () => {
      // Given: primaryTimeが21:00、現在が20:00
      const settings = {
        primaryTime: '21:00',
        timezone: 'Asia/Tokyo',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
      };
      // 2025-12-18 20:00 JST
      const currentTime = new Date('2025-12-18T11:00:00Z');

      // When: 配信時刻を判定
      const result = isTimeToSendNotification(settings, currentTime);

      // Then: falseを返す
      expect(result).toBe(false);
    });

    it('activeDaysに含まれない曜日ではfalseを返す', () => {
      // Given: 日曜（0）が無効、現在が日曜
      const settings = {
        primaryTime: '21:00',
        timezone: 'Asia/Tokyo',
        activeDays: [1, 2, 3, 4, 5, 6], // 日曜を除外
      };
      // 2025-12-21 (日曜) 21:00 JST
      const currentTime = new Date('2025-12-21T12:00:00Z');

      // When: 配信時刻を判定
      const result = isTimeToSendNotification(settings, currentTime);

      // Then: falseを返す
      expect(result).toBe(false);
    });

    it('異なるタイムゾーンで正しく計算される', () => {
      // Given: America/New_York タイムゾーン
      const settings = {
        primaryTime: '21:00',
        timezone: 'America/New_York',
        activeDays: [0, 1, 2, 3, 4, 5, 6],
      };
      // 2025-12-18 21:00 EST = 2025-12-19 02:00 UTC
      const currentTime = new Date('2025-12-19T02:00:00Z');

      // When: 配信時刻を判定
      const result = isTimeToSendNotification(settings, currentTime);

      // Then: trueを返す
      expect(result).toBe(true);
    });
  });

  describe('getCurrentDayOfWeek (タスク7.2)', () => {
    it('UTCの日時からタイムゾーンを考慮した曜日を取得する', () => {
      // Given: 2025-12-18 (木曜日) 23:00 UTC = 2025-12-19 (金曜日) 08:00 JST
      const utcTime = new Date('2025-12-18T23:00:00Z');

      // When: Asia/Tokyo での曜日を取得
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', utcTime);

      // Then: 金曜日（5）を返す
      expect(dayOfWeek).toBe(5);
    });

    it('日付をまたがない場合の曜日を正しく返す', () => {
      // Given: 2025-12-18 (木曜日) 10:00 UTC = 2025-12-18 (木曜日) 19:00 JST
      const utcTime = new Date('2025-12-18T10:00:00Z');

      // When: Asia/Tokyo での曜日を取得
      const dayOfWeek = getCurrentDayOfWeek('Asia/Tokyo', utcTime);

      // Then: 木曜日（4）を返す
      expect(dayOfWeek).toBe(4);
    });
  });

  describe('shouldSkipNotification (タスク7.3)', () => {
    const validUserId = 'user-123';

    it('当日のエントリーが存在する場合trueを返す', async () => {
      // Given: 当日のエントリーが存在
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'entry-1' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // 2025-12-18 21:00 JST
      const currentTime = new Date('2025-12-18T12:00:00Z');

      // When: スキップ判定
      const result = await shouldSkipNotification(
        validUserId,
        currentTime,
        'Asia/Tokyo'
      );

      // Then: trueを返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('当日のエントリーが存在しない場合falseを返す', async () => {
      // Given: 当日のエントリーが存在しない
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // 2025-12-18 21:00 JST
      const currentTime = new Date('2025-12-18T12:00:00Z');

      // When: スキップ判定
      const result = await shouldSkipNotification(
        validUserId,
        currentTime,
        'Asia/Tokyo'
      );

      // Then: falseを返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラー
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const currentTime = new Date('2025-12-18T12:00:00Z');

      // When: スキップ判定
      const result = await shouldSkipNotification(
        validUserId,
        currentTime,
        'Asia/Tokyo'
      );

      // Then: エラーを返す
      expect(result.ok).toBe(false);
    });
  });
});

describe('SendResult型', () => {
  it('成功結果の型が正しく定義されている', () => {
    const result: SendResult = {
      subscriptionId: 'sub-1',
      success: true,
      statusCode: 201,
    };
    expect(result.success).toBe(true);
  });

  it('失敗結果の型が正しく定義されている', () => {
    const result: SendResult = {
      subscriptionId: 'sub-1',
      success: false,
      statusCode: 410,
      error: 'Gone',
      shouldRemove: true,
    };
    expect(result.success).toBe(false);
    expect(result.shouldRemove).toBe(true);
  });
});

describe('DispatchError型', () => {
  it('NO_SUBSCRIPTIONSエラー型が正しく定義されている', () => {
    const error: DispatchError = { type: 'NO_SUBSCRIPTIONS' };
    expect(error.type).toBe('NO_SUBSCRIPTIONS');
  });

  it('ALL_FAILEDエラー型が正しく定義されている', () => {
    const error: DispatchError = {
      type: 'ALL_FAILED',
      results: [{ subscriptionId: 'sub-1', success: false, error: 'Failed' }],
    };
    expect(error.type).toBe('ALL_FAILED');
    expect(error.results).toHaveLength(1);
  });

  it('VAPID_ERRORエラー型が正しく定義されている', () => {
    const error: DispatchError = {
      type: 'VAPID_ERROR',
      message: 'Invalid VAPID key',
    };
    expect(error.type).toBe('VAPID_ERROR');
    expect(error.message).toBe('Invalid VAPID key');
  });
});
