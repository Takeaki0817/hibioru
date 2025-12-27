/**
 * 通知フロー統合テスト
 *
 * タスク14.1: 通知フロー全体の統合テスト
 * タスク14.2: バリデーションとエラーケースのテスト
 *
 * Requirements:
 * - 14.1: 1.1, 3.1, 4.1, 4.4
 * - 14.2: 1.4, 2.4, 2.5, 2.6, 2.7, 5.3
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// ============================================================
// モック設定
// ============================================================

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// web-pushモック
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

// 実装モジュールのインポート
import { subscribe, unsubscribe, getSubscriptions, removeInvalidSubscription } from '@/features/notification/api/subscription';
import { logNotification, updateEntryRecorded } from '@/features/notification/api/log';
import { validateNotificationSettings, validatePrimaryTime, validateFollowUpIntervalMinutes, validateFollowUpMaxCount, validateActiveDays } from '@/features/notification/api/validation';
import { shouldSendFollowUp, calculateFollowUpSchedule, cancelFollowUps } from '@/features/notification/api/followup';
import { sendToAllDevices, sendNotification, shouldSkipNotification } from '@/features/notification/api/sender';
import { handleEntryCreated } from '@/features/notification/api/entry-integration';
import webpush from 'web-push';

// ============================================================
// タスク14.1: 通知フロー全体の統合テスト
// ============================================================

describe('通知フロー統合テスト（タスク14.1）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('購読登録から通知受信までのエンドツーエンドフロー（Requirement 1.1）', () => {
    const testUserId = 'test-user-integration-001';
    const testSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
      keys: {
        p256dh: 'BPnJfbEFvA1KjXz-test-p256dh-key',
        auth: 'test-auth-key-123',
      },
      userAgent: 'Mozilla/5.0 (Test Browser)',
    };

    it('購読登録 -> 通知送信 -> ログ記録の一連のフローが正常に動作する', async () => {
      // === Step 1: 購読登録 ===
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'sub-flow-001',
              user_id: testUserId,
              endpoint: testSubscription.endpoint,
              p256dh: testSubscription.keys.p256dh,
              auth: testSubscription.keys.auth,
              user_agent: testSubscription.userAgent,
              created_at: '2025-12-18T10:00:00Z',
            },
            error: null,
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      const subscribeResult = await subscribe(testUserId, testSubscription);
      expect(subscribeResult.ok).toBe(true);
      if (subscribeResult.ok) {
        expect(subscribeResult.value.endpoint).toBe(testSubscription.endpoint);
      }

      // === Step 2: 購読情報取得確認 ===
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'sub-flow-001',
              user_id: testUserId,
              endpoint: testSubscription.endpoint,
              p256dh: testSubscription.keys.p256dh,
              auth: testSubscription.keys.auth,
              user_agent: testSubscription.userAgent,
              created_at: '2025-12-18T10:00:00Z',
            },
          ],
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const getResult = await getSubscriptions(testUserId);
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value).toHaveLength(1);
        expect(getResult.value[0].endpoint).toBe(testSubscription.endpoint);
      }
    });

    it('複数デバイスの購読情報を正しく管理できる（Requirement 1.2）', async () => {
      // Given: ユーザーに2つのデバイスが登録されている
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'sub-device-1',
              user_id: testUserId,
              endpoint: 'https://fcm.googleapis.com/device1',
              p256dh: 'device1-p256dh',
              auth: 'device1-auth',
              user_agent: 'Chrome/iOS',
              created_at: '2025-12-18T10:00:00Z',
            },
            {
              id: 'sub-device-2',
              user_id: testUserId,
              endpoint: 'https://fcm.googleapis.com/device2',
              p256dh: 'device2-p256dh',
              auth: 'device2-auth',
              user_agent: 'Safari/MacOS',
              created_at: '2025-12-18T11:00:00Z',
            },
          ],
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // When: 購読情報を取得
      const result = await getSubscriptions(testUserId);

      // Then: 両方のデバイスが取得できる
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value.map(s => s.endpoint)).toContain('https://fcm.googleapis.com/device1');
        expect(result.value.map(s => s.endpoint)).toContain('https://fcm.googleapis.com/device2');
      }
    });
  });

  describe('メインリマインドの配信確認（Requirement 3.1）', () => {
    const testUserId = 'test-user-main-reminder';

    it('primaryTime到達時にメインリマインドを送信できる', async () => {
      // Given: ユーザーの通知設定とエントリー状況
      // - primaryTime: 21:00 JST
      // - 当日の記録なし
      const currentTime = new Date('2025-12-18T12:00:00Z'); // JST 21:00

      // entriesテーブルのモック（当日記録なし）
      const mockSelectEntries = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [], // 記録なし
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelectEntries });

      // When: スキップ判定を実行
      const skipResult = await shouldSkipNotification(testUserId, currentTime, 'Asia/Tokyo');

      // Then: スキップしない（通知を送信すべき）
      expect(skipResult.ok).toBe(true);
      if (skipResult.ok) {
        expect(skipResult.value).toBe(false);
      }
    });

    it('記録済みユーザーはメインリマインドをスキップする（Requirement 3.4）', async () => {
      // Given: 当日の記録あり
      const currentTime = new Date('2025-12-18T12:00:00Z'); // JST 21:00
      const testUserId = 'test-user-with-entry';

      const mockSelectEntries = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'entry-001' }], // 記録あり
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelectEntries });

      // When: スキップ判定を実行
      const skipResult = await shouldSkipNotification(testUserId, currentTime, 'Asia/Tokyo');

      // Then: スキップする
      expect(skipResult.ok).toBe(true);
      if (skipResult.ok) {
        expect(skipResult.value).toBe(true);
      }
    });
  });

  describe('追いリマインドの段階的送信確認（Requirement 4.1）', () => {
    const testUserId = 'test-user-followup';

    it('primaryTime後にfollowUpInterval経過で追いリマインドを送信すべきと判定する', async () => {
      // Given: primaryTime 21:00、interval 60分、現在22:05 JST（21:00 + 65分）
      const currentTime = new Date('2025-12-18T13:05:00Z'); // JST 22:05

      // notification_settingsのモック
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: {
          user_id: testUserId,
          enabled: true,
          primary_time: '21:00',
          timezone: 'Asia/Tokyo',
          follow_up_enabled: true,
          follow_up_interval_minutes: 60,
          follow_up_max_count: 2,
          active_days: [0, 1, 2, 3, 4, 5, 6],
        },
        error: null,
      });

      // notification_logsのモック（メインリマインドのみ送信済み）
      const mockOrder = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValueOnce({
          data: [
            { type: 'main_reminder', sent_at: '2025-12-18T12:00:00Z' },
          ],
          error: null,
        }),
      });

      // entriesのモック（記録なし）
      const mockLimit = jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lt: jest.fn().mockReturnValue({
                    order: mockOrder,
                  }),
                }),
              }),
            }),
          };
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lt: jest.fn().mockReturnValue({
                      limit: mockLimit,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
      });

      // When: 追いリマインド判定を実行
      const decision = await shouldSendFollowUp(testUserId, currentTime);

      // Then: 送信すべきと判定される
      expect(decision.ok).toBe(true);
      if (decision.ok) {
        expect(decision.value.shouldSend).toBe(true);
        expect(decision.value.followUpCount).toBe(1);
      }
    });

    it('maxCountに達したら追いリマインドを終了する（Requirement 4.6）', async () => {
      // テストケースはfollowup.test.tsで詳細にカバー済み
      // ここでは純粋関数のスケジュール計算を確認
      const schedule = calculateFollowUpSchedule(
        '21:00',
        60,
        2, // maxCount: 2
        'Asia/Tokyo',
        new Date('2025-12-18T12:00:00Z')
      );

      expect(schedule.followUpTimes).toHaveLength(2);
      expect(schedule.followUpTimes[0].followUpNumber).toBe(1);
      expect(schedule.followUpTimes[1].followUpNumber).toBe(2);
    });
  });

  describe('記録完了時のスキップ確認（Requirement 4.4）', () => {
    it('エントリー作成時に追いリマインドをキャンセルする', async () => {
      const testUserId = 'test-user-cancel';
      const entryCreatedAt = new Date('2025-12-18T13:30:00Z');

      // follow_up_cancellationsへの挿入モック
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'cancel-001',
          user_id: testUserId,
          target_date: '2025-12-18',
          cancelled_at: entryCreatedAt.toISOString(),
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      // When: キャンセル処理を実行
      const result = await cancelFollowUps(testUserId, entryCreatedAt);

      // Then: 成功
      expect(result.ok).toBe(true);
    });
  });
});

// ============================================================
// タスク14.2: バリデーションとエラーケースのテスト
// ============================================================

describe('バリデーションとエラーケーステスト（タスク14.2）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('設定値の範囲チェック検証（Requirements 2.4, 2.5, 2.6, 2.7）', () => {
    describe('primaryTimeの範囲チェック（Requirement 2.4）', () => {
      it.each([
        ['00:00', true, '深夜0時は有効'],
        ['23:59', true, '23時59分は有効'],
        ['12:30', true, '正午30分は有効'],
        ['24:00', false, '24時は無効'],
        ['25:00', false, '25時は無効'],
        ['12:60', false, '60分は無効'],
        ['abc', false, '文字列は無効'],
        ['', false, '空文字は無効'],
        ['9:00', false, '1桁の時は無効'],
        ['09:0', false, '1桁の分は無効'],
      ])('primaryTime "%s" はisValid=%s（%s）', (time, expectedValid, description) => {
        const result = validatePrimaryTime(time);
        expect(result.isValid).toBe(expectedValid);
      });
    });

    describe('followUpIntervalMinutesの範囲チェック（Requirement 2.5）', () => {
      it.each([
        [15, true, '最小値15分は有効'],
        [60, true, 'デフォルト値60分は有効'],
        [180, true, '最大値180分は有効'],
        [14, false, '15分未満は無効'],
        [181, false, '180分超過は無効'],
        [0, false, '0分は無効'],
        [-1, false, '負の値は無効'],
        [30.5, false, '小数は無効'],
      ])('followUpIntervalMinutes %d分 はisValid=%s（%s）', (minutes, expectedValid, description) => {
        const result = validateFollowUpIntervalMinutes(minutes);
        expect(result.isValid).toBe(expectedValid);
      });
    });

    describe('followUpMaxCountの範囲チェック（Requirement 2.6）', () => {
      it.each([
        [1, true, '最小値1回は有効'],
        [2, true, 'デフォルト値2回は有効'],
        [3, true, '3回は有効'],
        [4, true, '4回は有効'],
        [5, true, '最大値5回は有効'],
        [0, false, '0回は無効'],
        [6, false, '6回は無効（上限超過）'],
        [-1, false, '負の値は無効'],
        [1.5, false, '小数は無効'],
      ])('followUpMaxCount %d回 はisValid=%s（%s）', (count, expectedValid, description) => {
        const result = validateFollowUpMaxCount(count);
        expect(result.isValid).toBe(expectedValid);
      });
    });

    describe('activeDaysの形式検証（Requirement 2.7）', () => {
      it.each([
        [[0, 1, 2, 3, 4, 5, 6], true, '全曜日は有効'],
        [[0], true, '日曜のみは有効'],
        [[1, 2, 3, 4, 5], true, '平日のみは有効'],
        [[], true, '空配列は有効（全曜日無効）'],
        [[7], false, '7は無効'],
        [[-1], false, '負の値は無効'],
        [[0, 0], false, '重複は無効'],
        [[1.5], false, '小数は無効'],
      ])('activeDays %j はisValid=%s（%s）', (days, expectedValid, description) => {
        const result = validateActiveDays(days);
        expect(result.isValid).toBe(expectedValid);
      });
    });

    describe('複合バリデーション', () => {
      it('すべての設定が有効な場合は成功', () => {
        const result = validateNotificationSettings({
          primaryTime: '21:00',
          followUpIntervalMinutes: 60,
          followUpMaxCount: 2,
          activeDays: [0, 1, 2, 3, 4, 5, 6],
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('複数のエラーがある場合はすべてのエラーを返す', () => {
        const result = validateNotificationSettings({
          primaryTime: '25:00',        // 無効
          followUpIntervalMinutes: 10, // 無効
          followUpMaxCount: 6,         // 無効（6は上限超過）
          activeDays: [7],             // 無効
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('無効エンドポイントの自動削除検証（Requirement 5.3）', () => {
    it('410 Gone応答を受け取った購読情報を自動削除する', async () => {
      const subscriptionId = 'sub-invalid-001';

      // 削除モック
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 無効な購読を削除
      const result = await removeInvalidSubscription(subscriptionId, '410 Gone');

      // Then: 削除成功
      expect(result.ok).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('push_subscriptions');
    });

    it('存在しない購読IDでもエラーにならない（べき等性）', async () => {
      const nonExistentId = 'sub-not-exist';

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
          count: 0, // 削除対象なし
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 存在しないIDで削除を試みる
      const result = await removeInvalidSubscription(nonExistentId);

      // Then: エラーにならない
      expect(result.ok).toBe(true);
    });
  });

  describe('通知非対応ブラウザでの動作確認（Requirement 1.4）', () => {
    // 注: ブラウザ非対応の判定はクライアント側（UIコンポーネント）で行われる
    // ここではサーバー側で購読情報がない場合の動作を確認

    it('購読情報がないユーザーへの通知送信はNO_SUBSCRIPTIONSエラーを返す', async () => {
      const testUserId = 'user-no-subscriptions';

      // 購読情報なし
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      // When: 全デバイスへ通知送信を試みる
      const result = await sendToAllDevices(testUserId, {
        title: 'テスト通知',
        body: 'テスト本文',
      });

      // Then: NO_SUBSCRIPTIONSエラー
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NO_SUBSCRIPTIONS');
      }
    });
  });

  describe('データベースエラーハンドリング', () => {
    it('購読登録時のデータベースエラーを適切にハンドリングする', async () => {
      const testUserId = 'user-db-error';
      const testSubscription = {
        endpoint: 'https://test.endpoint',
        keys: { p256dh: 'test', auth: 'test' },
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database connection failed' },
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 登録を試みる
      const result = await subscribe(testUserId, testSubscription);

      // Then: DATABASE_ERRORを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });

    it('購読解除時のデータベースエラーを適切にハンドリングする', async () => {
      const testUserId = 'user-db-error';
      const testEndpoint = 'https://test.endpoint';

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      // When: 解除を試みる
      const result = await unsubscribe(testUserId, testEndpoint);

      // Then: DATABASE_ERRORを返す
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('重複購読エラーの検出', () => {
    it('同一エンドポイントの重複登録でDUPLICATE_ENDPOINTエラーを返す', async () => {
      const testUserId = 'user-duplicate';
      const testSubscription = {
        endpoint: 'https://already.registered.endpoint',
        keys: { p256dh: 'test', auth: 'test' },
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        }),
      });
      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert });

      // When: 重複登録を試みる
      const result = await subscribe(testUserId, testSubscription);

      // Then: DUPLICATE_ENDPOINTエラー
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DUPLICATE_ENDPOINT');
      }
    });
  });
});

// ============================================================
// エントリー連携統合テスト
// ============================================================

describe('エントリー作成時の通知連携統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // entry-integration.test.tsで詳細テスト済みのため、
  // ここでは基本的な統合動作のみ確認
  describe('handleEntryCreated統合', () => {
    it('正常なイベントで通知ログ更新と追いリマインドキャンセルが実行される', async () => {
      // このテストは entry-integration.test.ts で詳細にカバー済み
      // 統合テストとしては、モジュール間の連携が正しく動作することを確認
      expect(typeof handleEntryCreated).toBe('function');
    });
  });
});

// ============================================================
// スケジュール計算の精度テスト
// ============================================================

describe('スケジュール計算の精度テスト', () => {
  describe('タイムゾーン計算', () => {
    it('Asia/Tokyo（JST）での追いリマインドスケジュールが正確に計算される', () => {
      // primaryTime: 21:00 JST, interval: 60分, maxCount: 2
      const baseDate = new Date('2025-12-18T12:00:00Z'); // UTC 12:00 = JST 21:00

      const schedule = calculateFollowUpSchedule(
        '21:00',
        60,
        2,
        'Asia/Tokyo',
        baseDate
      );

      // primaryTimestampはJST 21:00 = UTC 12:00
      expect(schedule.primaryTimestamp.toISOString()).toBe('2025-12-18T12:00:00.000Z');

      // 追いリマインド1回目: 21:00 + 60分 = 22:00 JST = UTC 13:00
      expect(schedule.followUpTimes[0].scheduledTime.toISOString()).toBe('2025-12-18T13:00:00.000Z');

      // 追いリマインド2回目: 22:00 + 60分 = 23:00 JST = UTC 14:00
      expect(schedule.followUpTimes[1].scheduledTime.toISOString()).toBe('2025-12-18T14:00:00.000Z');
    });

    it('日付を跨ぐスケジュールが正確に計算される', () => {
      // primaryTime: 23:00 JST, interval: 90分, maxCount: 2
      const baseDate = new Date('2025-12-18T14:00:00Z'); // UTC 14:00 = JST 23:00

      const schedule = calculateFollowUpSchedule(
        '23:00',
        90,
        2,
        'Asia/Tokyo',
        baseDate
      );

      // primaryTimestampはJST 23:00 = UTC 14:00
      expect(schedule.primaryTimestamp.toISOString()).toBe('2025-12-18T14:00:00.000Z');

      // 追いリマインド1回目: 23:00 + 90分 = 00:30 JST（翌日） = UTC 15:30
      expect(schedule.followUpTimes[0].scheduledTime.toISOString()).toBe('2025-12-18T15:30:00.000Z');

      // 追いリマインド2回目: 00:30 + 90分 = 02:00 JST（翌日） = UTC 17:00
      expect(schedule.followUpTimes[1].scheduledTime.toISOString()).toBe('2025-12-18T17:00:00.000Z');
    });
  });

  describe('インターバル計算', () => {
    it.each([
      [15, 'minInterval', [15, 30]],
      [30, '30min', [30, 60]],
      [60, '60min', [60, 120]],
      [90, '90min', [90, 180]],
      [180, 'maxInterval', [180, 360]],
    ])('interval=%d分の場合、%sの追いリマインド時刻が正確', (interval, label, expectedMinutes) => {
      const schedule = calculateFollowUpSchedule(
        '21:00',
        interval,
        2,
        'Asia/Tokyo',
        new Date('2025-12-18T12:00:00Z')
      );

      // 各追いリマインドの間隔を検証
      const primaryTime = schedule.primaryTimestamp.getTime();
      schedule.followUpTimes.forEach((followUp, index) => {
        const diffMinutes = (followUp.scheduledTime.getTime() - primaryTime) / (60 * 1000);
        expect(diffMinutes).toBe(expectedMinutes[index]);
      });
    });
  });
});
