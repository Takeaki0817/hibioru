/**
 * 購読登録/解除APIのテスト
 *
 * POST /api/notifications/subscribe - 購読登録
 * DELETE /api/notifications/subscribe - 購読解除
 */

import { NextRequest } from 'next/server';

// 購読サービスのモック
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/features/notification/api/subscription', () => ({
  subscribe: (...args: unknown[]) => mockSubscribe(...args),
  unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
}));

// Supabase認証のモック
const mockGetUser = jest.fn();
const mockSupabaseClient = {
  auth: {
    getUser: () => mockGetUser(),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// ハンドラーのインポート（モック設定後）
import { POST, DELETE } from '@/app/api/notifications/subscribe/route';

describe('POST /api/notifications/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validRequestBody = {
    subscription: {
      endpoint: 'https://push.example.com/subscription/abc123',
      keys: {
        p256dh: 'BPnJfbEFvA1KjXz...',
        auth: 'auth-key-123',
      },
    },
  };

  it('認証済みユーザーの購読を正常に登録できる', async () => {
    // Given: 認証済みユーザー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockSubscribe.mockResolvedValue({
      ok: true,
      value: {
        id: 'sub-1',
        userId: 'user-123',
        endpoint: validRequestBody.subscription.endpoint,
        p256dhKey: validRequestBody.subscription.keys.p256dh,
        authKey: validRequestBody.subscription.keys.auth,
        userAgent: null,
        createdAt: new Date(),
      },
    });

    // When: 購読登録リクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Then: 成功レスポンス
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.subscriptionId).toBe('sub-1');
  });

  it('未認証ユーザーは401エラーを返す', async () => {
    // Given: 未認証ユーザー
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    });

    // When: 購読登録リクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Then: 401エラー
    expect(response.status).toBe(401);
  });

  it('不正なリクエストボディは400エラーを返す', async () => {
    // Given: 認証済みユーザー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // When: 不正なリクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Then: 400エラー
    expect(response.status).toBe(400);
  });

  it('重複登録時は409エラーを返す', async () => {
    // Given: 認証済みユーザー、重複エンドポイント
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockSubscribe.mockResolvedValue({
      ok: false,
      error: { type: 'DUPLICATE_ENDPOINT' },
    });

    // When: 購読登録リクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Then: 409エラー
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('既に登録されています');
  });

  it('登録失敗時は再試行を促すメッセージを返す', async () => {
    // Given: 認証済みユーザー、データベースエラー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockSubscribe.mockResolvedValue({
      ok: false,
      error: { type: 'DATABASE_ERROR', message: 'Connection error' },
    });

    // When: 購読登録リクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Then: 500エラーと再試行メッセージ
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('再試行');
  });

  it('userAgentを含むリクエストを処理できる', async () => {
    // Given: 認証済みユーザー、userAgent付きリクエスト
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockSubscribe.mockResolvedValue({
      ok: true,
      value: {
        id: 'sub-2',
        userId: 'user-123',
        endpoint: validRequestBody.subscription.endpoint,
        p256dhKey: validRequestBody.subscription.keys.p256dh,
        authKey: validRequestBody.subscription.keys.auth,
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
      },
    });

    const requestWithUserAgent = {
      ...validRequestBody,
      userAgent: 'Mozilla/5.0',
    };

    // When: 購読登録リクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(requestWithUserAgent),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Then: 成功
    expect(response.status).toBe(200);
    expect(mockSubscribe).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ userAgent: 'Mozilla/5.0' })
    );
  });
});

describe('DELETE /api/notifications/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validEndpoint = 'https://push.example.com/subscription/abc123';

  it('認証済みユーザーの購読を正常に解除できる', async () => {
    // Given: 認証済みユーザー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockUnsubscribe.mockResolvedValue({ ok: true, value: undefined });

    // When: 購読解除リクエスト
    const request = new NextRequest(
      `http://localhost/api/notifications/subscribe?endpoint=${encodeURIComponent(validEndpoint)}`,
      { method: 'DELETE' }
    );
    const response = await DELETE(request);

    // Then: 成功レスポンス
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('未認証ユーザーは401エラーを返す', async () => {
    // Given: 未認証ユーザー
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    });

    // When: 購読解除リクエスト
    const request = new NextRequest(
      `http://localhost/api/notifications/subscribe?endpoint=${encodeURIComponent(validEndpoint)}`,
      { method: 'DELETE' }
    );
    const response = await DELETE(request);

    // Then: 401エラー
    expect(response.status).toBe(401);
  });

  it('endpointパラメータがない場合は400エラーを返す', async () => {
    // Given: 認証済みユーザー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // When: endpointなしでリクエスト
    const request = new NextRequest('http://localhost/api/notifications/subscribe', {
      method: 'DELETE',
    });
    const response = await DELETE(request);

    // Then: 400エラー
    expect(response.status).toBe(400);
  });

  it('該当デバイスのみ削除し他デバイスは維持される', async () => {
    // Given: 認証済みユーザー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockUnsubscribe.mockResolvedValue({ ok: true, value: undefined });

    // When: 特定のエンドポイントのみ削除
    const request = new NextRequest(
      `http://localhost/api/notifications/subscribe?endpoint=${encodeURIComponent(validEndpoint)}`,
      { method: 'DELETE' }
    );
    await DELETE(request);

    // Then: 正しいパラメータで呼び出されている
    expect(mockUnsubscribe).toHaveBeenCalledWith('user-123', validEndpoint);
  });

  it('データベースエラー時は500エラーを返す', async () => {
    // Given: 認証済みユーザー、データベースエラー
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockUnsubscribe.mockResolvedValue({
      ok: false,
      error: { type: 'DATABASE_ERROR', message: 'Connection error' },
    });

    // When: 購読解除リクエスト
    const request = new NextRequest(
      `http://localhost/api/notifications/subscribe?endpoint=${encodeURIComponent(validEndpoint)}`,
      { method: 'DELETE' }
    );
    const response = await DELETE(request);

    // Then: 500エラー
    expect(response.status).toBe(500);
  });
});
