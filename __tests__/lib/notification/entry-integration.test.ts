/**
 * エントリー作成時の通知連携機能テスト
 *
 * タスク13.1の実装をTDDで検証します:
 * - 新規エントリー作成時に当日の通知ログのentry_recorded_atを更新
 * - 追いリマインドのキャンセル処理をトリガー
 *
 * Requirements: 4.4, 6.1
 */

import {
  handleEntryCreated,
  EntryCreatedEvent,
  EntryIntegrationError,
  EntryIntegrationResult,
} from '@/lib/notification/entry-integration';

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// log.ts関数のモック
jest.mock('@/lib/notification/log', () => ({
  updateEntryRecorded: jest.fn(),
}));

// followup.ts関数のモック
jest.mock('@/lib/notification/followup', () => ({
  cancelFollowUps: jest.fn(),
}));

import { updateEntryRecorded } from '@/lib/notification/log';
import { cancelFollowUps } from '@/lib/notification/followup';

const mockedUpdateEntryRecorded = updateEntryRecorded as jest.MockedFunction<
  typeof updateEntryRecorded
>;
const mockedCancelFollowUps = cancelFollowUps as jest.MockedFunction<
  typeof cancelFollowUps
>;

describe('EntryIntegration（エントリー作成時の通知連携）', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEntryCreated（エントリー作成時の処理）', () => {
    const validEvent: EntryCreatedEvent = {
      userId: 'user-123',
      entryId: 'entry-456',
      createdAt: new Date('2025-12-18T13:30:00Z'),
    };

    describe('正常系', () => {
      it('エントリー作成時に通知ログのentry_recorded_atを更新する（Requirement 6.1）', async () => {
        // Given: updateEntryRecordedとcancelFollowUpsが成功
        mockedUpdateEntryRecorded.mockResolvedValue({ ok: true, value: undefined });
        mockedCancelFollowUps.mockResolvedValue({ ok: true, value: undefined });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: updateEntryRecordedが正しい引数で呼ばれる
        expect(mockedUpdateEntryRecorded).toHaveBeenCalledWith(
          validEvent.userId,
          validEvent.createdAt
        );
        expect(result.ok).toBe(true);
      });

      it('エントリー作成時に追いリマインドをキャンセルする（Requirement 4.4）', async () => {
        // Given: updateEntryRecordedとcancelFollowUpsが成功
        mockedUpdateEntryRecorded.mockResolvedValue({ ok: true, value: undefined });
        mockedCancelFollowUps.mockResolvedValue({ ok: true, value: undefined });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: cancelFollowUpsが正しい引数で呼ばれる
        expect(mockedCancelFollowUps).toHaveBeenCalledWith(
          validEvent.userId,
          validEvent.createdAt
        );
        expect(result.ok).toBe(true);
      });

      it('両方の処理が成功した場合、成功結果を返す', async () => {
        // Given: 両方の処理が成功
        mockedUpdateEntryRecorded.mockResolvedValue({ ok: true, value: undefined });
        mockedCancelFollowUps.mockResolvedValue({ ok: true, value: undefined });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: 成功結果を返す
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.logUpdated).toBe(true);
          expect(result.value.followUpsCancelled).toBe(true);
        }
      });

      it('updateEntryRecordedとcancelFollowUpsは並列で実行される', async () => {
        // Given: 処理完了時刻を記録するためのモック
        const callOrder: string[] = [];
        let updateResolve: () => void;
        let cancelResolve: () => void;

        const updatePromise = new Promise<void>((resolve) => {
          updateResolve = resolve;
        });
        const cancelPromise = new Promise<void>((resolve) => {
          cancelResolve = resolve;
        });

        mockedUpdateEntryRecorded.mockImplementation(async () => {
          callOrder.push('update-started');
          await updatePromise;
          callOrder.push('update-completed');
          return { ok: true, value: undefined };
        });

        mockedCancelFollowUps.mockImplementation(async () => {
          callOrder.push('cancel-started');
          await cancelPromise;
          callOrder.push('cancel-completed');
          return { ok: true, value: undefined };
        });

        // When: handleEntryCreatedを実行
        const resultPromise = handleEntryCreated(validEvent);

        // 両方が開始されていることを確認
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(callOrder).toContain('update-started');
        expect(callOrder).toContain('cancel-started');

        // 完了させる
        updateResolve!();
        cancelResolve!();

        const result = await resultPromise;

        // Then: 成功
        expect(result.ok).toBe(true);
      });
    });

    describe('エラー処理', () => {
      it('updateEntryRecordedが失敗しても処理を継続する', async () => {
        // Given: updateEntryRecordedが失敗
        mockedUpdateEntryRecorded.mockResolvedValue({
          ok: false,
          error: { type: 'DATABASE_ERROR', message: 'Connection failed' },
        });
        mockedCancelFollowUps.mockResolvedValue({ ok: true, value: undefined });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: 部分的成功を返す
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.logUpdated).toBe(false);
          expect(result.value.followUpsCancelled).toBe(true);
        }
      });

      it('cancelFollowUpsが失敗しても処理を継続する', async () => {
        // Given: cancelFollowUpsが失敗
        mockedUpdateEntryRecorded.mockResolvedValue({ ok: true, value: undefined });
        mockedCancelFollowUps.mockResolvedValue({
          ok: false,
          error: { type: 'DATABASE_ERROR', message: 'Connection failed' },
        });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: 部分的成功を返す
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.logUpdated).toBe(true);
          expect(result.value.followUpsCancelled).toBe(false);
        }
      });

      it('両方の処理が失敗した場合も結果を返す', async () => {
        // Given: 両方の処理が失敗
        mockedUpdateEntryRecorded.mockResolvedValue({
          ok: false,
          error: { type: 'DATABASE_ERROR', message: 'Log update failed' },
        });
        mockedCancelFollowUps.mockResolvedValue({
          ok: false,
          error: { type: 'DATABASE_ERROR', message: 'Cancel failed' },
        });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: 両方失敗の結果を返す（ただしエラーではなく部分結果）
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.logUpdated).toBe(false);
          expect(result.value.followUpsCancelled).toBe(false);
        }
      });

      it('予期せぬ例外が発生した場合もlogUpdated=falseで結果を返す（エントリー作成を阻害しない）', async () => {
        // Given: updateEntryRecordedで予期せぬ例外
        mockedUpdateEntryRecorded.mockRejectedValue(new Error('Unexpected error'));
        mockedCancelFollowUps.mockResolvedValue({ ok: true, value: undefined });

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(validEvent);

        // Then: 例外を吸収してlogUpdated=falseで結果を返す
        // （通知連携の失敗がエントリー作成を阻害すべきではない）
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.logUpdated).toBe(false);
          expect(result.value.followUpsCancelled).toBe(true);
        }
      });
    });

    describe('入力バリデーション', () => {
      it('userIdが空の場合はエラーを返す', async () => {
        // Given: 空のuserId
        const invalidEvent: EntryCreatedEvent = {
          userId: '',
          entryId: 'entry-456',
          createdAt: new Date('2025-12-18T13:30:00Z'),
        };

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(invalidEvent);

        // Then: バリデーションエラー
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });

      it('entryIdが空の場合はエラーを返す', async () => {
        // Given: 空のentryId
        const invalidEvent: EntryCreatedEvent = {
          userId: 'user-123',
          entryId: '',
          createdAt: new Date('2025-12-18T13:30:00Z'),
        };

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(invalidEvent);

        // Then: バリデーションエラー
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });

      it('createdAtが無効な日付の場合はエラーを返す', async () => {
        // Given: 無効な日付
        const invalidEvent: EntryCreatedEvent = {
          userId: 'user-123',
          entryId: 'entry-456',
          createdAt: new Date('invalid'),
        };

        // When: handleEntryCreatedを実行
        const result = await handleEntryCreated(invalidEvent);

        // Then: バリデーションエラー
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });
  });
});

describe('型定義テスト', () => {
  it('EntryCreatedEvent型が正しく定義されている', () => {
    const event: EntryCreatedEvent = {
      userId: 'user-123',
      entryId: 'entry-456',
      createdAt: new Date('2025-12-18T13:30:00Z'),
    };
    expect(event.userId).toBeDefined();
    expect(event.entryId).toBeDefined();
    expect(event.createdAt).toBeInstanceOf(Date);
  });

  it('EntryIntegrationResult型が正しく定義されている', () => {
    const result: EntryIntegrationResult = {
      logUpdated: true,
      followUpsCancelled: true,
    };
    expect(result.logUpdated).toBe(true);
    expect(result.followUpsCancelled).toBe(true);
  });

  it('EntryIntegrationError型が正しく定義されている', () => {
    const validationError: EntryIntegrationError = {
      type: 'VALIDATION_ERROR',
      message: 'Invalid input',
    };
    expect(validationError.type).toBe('VALIDATION_ERROR');

    const unexpectedError: EntryIntegrationError = {
      type: 'UNEXPECTED_ERROR',
      message: 'Something went wrong',
    };
    expect(unexpectedError.type).toBe('UNEXPECTED_ERROR');
  });
});
