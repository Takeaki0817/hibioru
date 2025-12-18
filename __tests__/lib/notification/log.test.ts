/**
 * 通知ログサービスのテスト
 *
 * NotificationLogServiceの機能をテストします:
 * - 送信ログの記録（6.1）
 * - 記録追跡機能（6.2）
 * - ログクリーンアップ（6.3）
 *
 * Requirements: 3.3, 3.5, 4.5, 6.1, 6.2, 6.3
 */

import {
  logNotification,
  updateEntryRecorded,
  cleanupOldLogs,
  NotificationLogInput,
  NotificationLog,
  LogError,
} from '@/features/notification/api/log';

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('NotificationLogService', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logNotification（6.1: 送信ログの記録機能）', () => {
    const validLogInput: NotificationLogInput = {
      userId: 'user-123',
      type: 'main_reminder',
      result: 'success',
    };

    it('通知送信ログを正常に記録できる', async () => {
      // Given: データベースにログを保存
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'log-1',
              user_id: validLogInput.userId,
              type: validLogInput.type,
              sent_at: '2025-12-18T12:00:00Z',
              result: validLogInput.result,
              error_message: null,
              entry_recorded_at: null,
              created_at: '2025-12-18T12:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: ログを記録
      const result = await logNotification(validLogInput);

      // Then: 成功を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('log-1');
        expect(result.value.userId).toBe(validLogInput.userId);
        expect(result.value.type).toBe(validLogInput.type);
        expect(result.value.result).toBe('success');
      }
    });

    it('失敗結果のログを記録できる（Requirements 3.5）', async () => {
      // Given: 失敗ログの入力
      const failedLogInput: NotificationLogInput = {
        userId: 'user-123',
        type: 'main_reminder',
        result: 'failed',
        errorMessage: 'Push service unavailable',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'log-2',
              user_id: failedLogInput.userId,
              type: failedLogInput.type,
              sent_at: '2025-12-18T12:00:00Z',
              result: failedLogInput.result,
              error_message: failedLogInput.errorMessage,
              entry_recorded_at: null,
              created_at: '2025-12-18T12:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 失敗ログを記録
      const result = await logNotification(failedLogInput);

      // Then: エラーメッセージが保存される
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.result).toBe('failed');
        expect(result.value.errorMessage).toBe('Push service unavailable');
      }
    });

    it('スキップ結果のログを記録できる', async () => {
      // Given: スキップログの入力
      const skippedLogInput: NotificationLogInput = {
        userId: 'user-123',
        type: 'main_reminder',
        result: 'skipped',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'log-3',
              user_id: skippedLogInput.userId,
              type: skippedLogInput.type,
              sent_at: '2025-12-18T12:00:00Z',
              result: skippedLogInput.result,
              error_message: null,
              entry_recorded_at: null,
              created_at: '2025-12-18T12:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: スキップログを記録
      const result = await logNotification(skippedLogInput);

      // Then: スキップ結果が保存される
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.result).toBe('skipped');
      }
    });

    it('追いリマインドのログを記録できる（Requirements 4.5）', async () => {
      // Given: 追いリマインドログの入力
      const chaseLogInput: NotificationLogInput = {
        userId: 'user-123',
        type: 'chase_reminder',
        result: 'success',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'log-4',
              user_id: chaseLogInput.userId,
              type: chaseLogInput.type,
              sent_at: '2025-12-18T13:00:00Z',
              result: chaseLogInput.result,
              error_message: null,
              entry_recorded_at: null,
              created_at: '2025-12-18T13:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 追いリマインドログを記録
      const result = await logNotification(chaseLogInput);

      // Then: 追いリマインドタイプが保存される
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.type).toBe('chase_reminder');
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

      // When: ログ記録を試みる
      const result = await logNotification(validLogInput);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('updateEntryRecorded（6.2: 記録追跡機能）', () => {
    const userId = 'user-123';
    const entryCreatedAt = new Date('2025-12-18T13:30:00Z');

    it('通知後のエントリー作成時刻を更新できる', async () => {
      // Given: 当日の通知ログが存在
      const mockUpdate = jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ update: mockUpdate });

      // When: entry_recorded_atを更新
      const result = await updateEntryRecorded(userId, entryCreatedAt);

      // Then: 成功を返す
      expect(result.ok).toBe(true);
    });

    it('更新対象がない場合もエラーにならない', async () => {
      // Given: 当日の通知ログが存在しない
      const mockUpdate = jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ update: mockUpdate });

      // When: 更新を試みる
      const result = await updateEntryRecorded(userId, entryCreatedAt);

      // Then: エラーにならない（更新対象がなくても成功）
      expect(result.ok).toBe(true);
    });

    it('複数の通知ログが更新される', async () => {
      // Given: 当日に複数の通知（メイン + 追い）が存在
      const mockUpdate = jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ update: mockUpdate });

      // When: entry_recorded_atを更新
      const result = await updateEntryRecorded(userId, entryCreatedAt);

      // Then: 成功を返す（複数行更新も可）
      expect(result.ok).toBe(true);
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラーが発生
      const mockUpdate = jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                error: { code: 'PGRST500', message: 'Internal error' },
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ update: mockUpdate });

      // When: 更新を試みる
      const result = await updateEntryRecorded(userId, entryCreatedAt);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('cleanupOldLogs（6.3: ログクリーンアップ機能）', () => {
    it('90日経過したログを削除できる', async () => {
      // Given: 90日経過したログが存在
      const mockDelete = jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({
          error: null,
          count: 100,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: クリーンアップを実行
      const result = await cleanupOldLogs(90);

      // Then: 削除された件数を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(100);
      }
    });

    it('削除対象がない場合は0を返す', async () => {
      // Given: 90日経過したログが存在しない
      const mockDelete = jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({
          error: null,
          count: 0,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: クリーンアップを実行
      const result = await cleanupOldLogs(90);

      // Then: 0を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });

    it('カスタム保持日数でクリーンアップできる', async () => {
      // Given: 30日を指定
      const mockDelete = jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({
          error: null,
          count: 50,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 30日でクリーンアップを実行
      const result = await cleanupOldLogs(30);

      // Then: 削除件数を返す
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(50);
      }
    });

    it('データベースエラーを適切にハンドリングする', async () => {
      // Given: データベースエラーが発生
      const mockDelete = jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({
          error: { code: 'PGRST500', message: 'Internal error' },
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: クリーンアップを試みる
      const result = await cleanupOldLogs(90);

      // Then: データベースエラーを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });
});

describe('型定義テスト', () => {
  it('NotificationLogInput型が正しく定義されている', () => {
    const input: NotificationLogInput = {
      userId: 'user-123',
      type: 'main_reminder',
      result: 'success',
    };
    expect(input.userId).toBeDefined();
    expect(input.type).toBeDefined();
    expect(input.result).toBeDefined();
  });

  it('NotificationLogInput型にオプショナルフィールドがある', () => {
    const input: NotificationLogInput = {
      userId: 'user-123',
      type: 'chase_reminder',
      result: 'failed',
      errorMessage: 'Connection timeout',
    };
    expect(input.errorMessage).toBe('Connection timeout');
  });

  it('NotificationLog型が正しく定義されている', () => {
    const log: NotificationLog = {
      id: 'log-1',
      userId: 'user-123',
      type: 'main_reminder',
      sentAt: new Date('2025-12-18T12:00:00Z'),
      result: 'success',
      errorMessage: null,
      entryRecordedAt: null,
    };
    expect(log.id).toBeDefined();
    expect(log.sentAt).toBeInstanceOf(Date);
  });

  it('LogError型が正しく定義されている', () => {
    const error: LogError = { type: 'DATABASE_ERROR', message: 'test error' };
    expect(error.type).toBe('DATABASE_ERROR');
    expect(error.message).toBe('test error');
  });
});
