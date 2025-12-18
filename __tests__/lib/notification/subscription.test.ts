/**
 * 購読管理サービスのテスト
 *
 * PushSubscriptionServiceの機能をテストします:
 * - 購読情報の登録
 * - 購読情報の取得
 * - 購読情報の削除
 * - 重複エンドポイントの検出
 * - 無効エンドポイントの自動削除
 */

import {
  subscribe,
  unsubscribe,
  getSubscriptions,
  removeInvalidSubscription,
  SubscriptionError,
} from '@/lib/notification/subscription';

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('PushSubscriptionService', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    const validUserId = 'user-123';
    const validSubscription = {
      endpoint: 'https://push.example.com/subscription/abc123',
      keys: {
        p256dh: 'BPnJfbEFvA1KjXz...',
        auth: 'auth-key-123',
      },
    };

    it('新規購読情報を正常に登録できる', async () => {
      // Given: データベースに購読情報が存在しない
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'sub-1',
              user_id: validUserId,
              endpoint: validSubscription.endpoint,
              p256dh: validSubscription.keys.p256dh,
              auth: validSubscription.keys.auth,
              created_at: '2025-12-18T00:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 購読を登録
      const result = await subscribe(validUserId, validSubscription);

      // Then: 成功を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('sub-1');
        expect(result.value.userId).toBe(validUserId);
        expect(result.value.endpoint).toBe(validSubscription.endpoint);
      }
    });

    it('同一エンドポイントの重複登録を検出する', async () => {
      // Given: 同一エンドポイントが既に存在
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 同一エンドポイントで登録を試みる
      const result = await subscribe(validUserId, validSubscription);

      // Then: 重複エラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DUPLICATE_ENDPOINT');
      }
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラーが発生
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Internal error' },
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 登録を試みる
      const result = await subscribe(validUserId, validSubscription);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });

    it('userAgentを含む購読情報を登録できる', async () => {
      // Given: userAgentを含む購読情報
      const subscriptionWithUserAgent = {
        ...validSubscription,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'sub-2',
              user_id: validUserId,
              endpoint: validSubscription.endpoint,
              p256dh: validSubscription.keys.p256dh,
              auth: validSubscription.keys.auth,
              user_agent: subscriptionWithUserAgent.userAgent,
              created_at: '2025-12-18T00:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 購読を登録
      const result = await subscribe(validUserId, subscriptionWithUserAgent);

      // Then: userAgentが保存される
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.userAgent).toBe(subscriptionWithUserAgent.userAgent);
      }
    });
  });

  describe('unsubscribe', () => {
    const validUserId = 'user-123';
    const validEndpoint = 'https://push.example.com/subscription/abc123';

    it('購読情報を正常に削除できる', async () => {
      // Given: 購読情報が存在する
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
            count: 1,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 購読を解除
      const result = await unsubscribe(validUserId, validEndpoint);

      // Then: 成功を返す
      expect(result.ok).toBe(true);
    });

    it('存在しないエンドポイントの削除を試みてもエラーにならない', async () => {
      // Given: 購読情報が存在しない
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
            count: 0,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 存在しないエンドポイントの削除を試みる
      const result = await unsubscribe(validUserId, validEndpoint);

      // Then: エラーにならない（べき等性）
      expect(result.ok).toBe(true);
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラーが発生
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { code: 'PGRST500', message: 'Internal error' },
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 削除を試みる
      const result = await unsubscribe(validUserId, validEndpoint);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('getSubscriptions', () => {
    const validUserId = 'user-123';

    it('ユーザーの全購読情報を取得できる', async () => {
      // Given: ユーザーに複数の購読情報が存在
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'sub-1',
              user_id: validUserId,
              endpoint: 'https://push.example.com/1',
              p256dh: 'key1',
              auth: 'auth1',
              user_agent: 'Chrome',
              created_at: '2025-12-18T00:00:00Z',
            },
            {
              id: 'sub-2',
              user_id: validUserId,
              endpoint: 'https://push.example.com/2',
              p256dh: 'key2',
              auth: 'auth2',
              user_agent: 'Safari',
              created_at: '2025-12-18T01:00:00Z',
            },
          ],
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // When: 購読情報を取得
      const result = await getSubscriptions(validUserId);

      // Then: 全購読情報を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].endpoint).toBe('https://push.example.com/1');
        expect(result.value[1].endpoint).toBe('https://push.example.com/2');
      }
    });

    it('購読情報がない場合は空配列を返す', async () => {
      // Given: ユーザーに購読情報が存在しない
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // When: 購読情報を取得
      const result = await getSubscriptions(validUserId);

      // Then: 空配列を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラーが発生
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST500', message: 'Internal error' },
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // When: 取得を試みる
      const result = await getSubscriptions(validUserId);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('removeInvalidSubscription', () => {
    const validSubscriptionId = 'sub-123';

    it('無効な購読情報を削除できる', async () => {
      // Given: 購読情報が存在する
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 無効な購読を削除
      const result = await removeInvalidSubscription(validSubscriptionId);

      // Then: 成功を返す
      expect(result.ok).toBe(true);
    });

    it('削除時にログを記録する（410 Gone対応）', async () => {
      // Given: 無効なエンドポイントの購読情報
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 無効な購読を削除（410 Gone対応）
      const result = await removeInvalidSubscription(validSubscriptionId, '410 Gone');

      // Then: 成功を返す（ログ記録は別途確認）
      expect(result.ok).toBe(true);
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラーが発生
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { code: 'PGRST500', message: 'Internal error' },
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 削除を試みる
      const result = await removeInvalidSubscription(validSubscriptionId);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });
});

describe('SubscriptionError型', () => {
  it('DUPLICATE_ENDPOINTエラー型が正しく定義されている', () => {
    const error: SubscriptionError = { type: 'DUPLICATE_ENDPOINT' };
    expect(error.type).toBe('DUPLICATE_ENDPOINT');
  });

  it('USER_NOT_FOUNDエラー型が正しく定義されている', () => {
    const error: SubscriptionError = { type: 'USER_NOT_FOUND' };
    expect(error.type).toBe('USER_NOT_FOUND');
  });

  it('DATABASE_ERRORエラー型が正しく定義されている', () => {
    const error: SubscriptionError = { type: 'DATABASE_ERROR', message: 'test error' };
    expect(error.type).toBe('DATABASE_ERROR');
    expect(error.message).toBe('test error');
  });
});
