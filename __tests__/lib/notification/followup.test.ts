/**
 * 追いリマインドスケジューラ (FollowUpScheduler) のテスト
 *
 * Requirements:
 * - 4.1: 追いリマインドのスケジュール計算
 * - 4.4: 記録完了時のキャンセル処理
 * - 4.6: followUpMaxCountに基づく送信制限
 */

import {
  calculateFollowUpSchedule,
  getNextFollowUpTime,
  shouldSendFollowUp,
  cancelFollowUps,
} from '@/lib/notification/followup';
import { createClient } from '@/lib/supabase/server';

// モック設定
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// モック化されたcreateClientの型
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// テスト用のモックSupabaseクライアント
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lt: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  is: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
};

describe('FollowUpScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // createClientモックをリセット
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedCreateClient.mockResolvedValue(mockSupabase as any);
  });

  describe('calculateFollowUpSchedule', () => {
    /**
     * Task 8.1: primaryTime後の追いリマインド送信時刻を計算
     */
    it('primaryTimeから追いリマインドのスケジュールを計算する', () => {
      // primaryTime: 21:00, interval: 60分, maxCount: 2
      const primaryTime = '21:00';
      const intervalMinutes = 60;
      const maxCount = 2;
      const timezone = 'Asia/Tokyo';
      const baseDate = new Date('2024-01-15T12:00:00Z'); // UTC 12:00 = JST 21:00

      const schedule = calculateFollowUpSchedule(
        primaryTime,
        intervalMinutes,
        maxCount,
        timezone,
        baseDate
      );

      // 追いリマインド1回目: 21:00 + 60分 = 22:00 JST
      // 追いリマインド2回目: 22:00 + 60分 = 23:00 JST
      expect(schedule.followUpTimes).toHaveLength(2);

      // 最初の追いリマインドは primaryTime + interval
      const firstFollowUp = schedule.followUpTimes[0];
      expect(firstFollowUp.followUpNumber).toBe(1);

      // 2番目の追いリマインド
      const secondFollowUp = schedule.followUpTimes[1];
      expect(secondFollowUp.followUpNumber).toBe(2);
    });

    /**
     * Task 8.1: followUpIntervalMinutesに基づくインターバル計算
     */
    it('異なるインターバルで正しく計算する', () => {
      // interval: 30分
      const schedule30 = calculateFollowUpSchedule(
        '21:00',
        30,
        2,
        'Asia/Tokyo',
        new Date('2024-01-15T12:00:00Z')
      );

      // 追いリマインド1回目: 21:00 + 30分 = 21:30
      // 追いリマインド2回目: 21:30 + 30分 = 22:00
      expect(schedule30.followUpTimes).toHaveLength(2);

      // interval: 90分
      const schedule90 = calculateFollowUpSchedule(
        '21:00',
        90,
        2,
        'Asia/Tokyo',
        new Date('2024-01-15T12:00:00Z')
      );

      // 追いリマインド1回目: 21:00 + 90分 = 22:30
      // 追いリマインド2回目: 22:30 + 90分 = 24:00 (翌日0:00)
      expect(schedule90.followUpTimes).toHaveLength(2);
    });

    /**
     * Task 8.1: followUpMaxCountに基づく送信回数制限
     */
    it('maxCountに基づいて回数を制限する', () => {
      // maxCount: 1
      const schedule1 = calculateFollowUpSchedule(
        '21:00',
        60,
        1,
        'Asia/Tokyo',
        new Date('2024-01-15T12:00:00Z')
      );
      expect(schedule1.followUpTimes).toHaveLength(1);

      // maxCount: 3
      const schedule3 = calculateFollowUpSchedule(
        '21:00',
        60,
        3,
        'Asia/Tokyo',
        new Date('2024-01-15T12:00:00Z')
      );
      expect(schedule3.followUpTimes).toHaveLength(3);
    });

    it('日付を跨ぐ場合も正しく計算する', () => {
      // primaryTime: 23:00, interval: 90分, maxCount: 2
      const schedule = calculateFollowUpSchedule(
        '23:00',
        90,
        2,
        'Asia/Tokyo',
        new Date('2024-01-15T14:00:00Z') // UTC 14:00 = JST 23:00
      );

      // 追いリマインド1回目: 23:00 + 90分 = 00:30 (翌日)
      // 追いリマインド2回目: 00:30 + 90分 = 02:00 (翌日)
      expect(schedule.followUpTimes).toHaveLength(2);

      // 最初の追いリマインドは翌日になる
      const firstFollowUp = schedule.followUpTimes[0];
      expect(firstFollowUp.followUpNumber).toBe(1);
    });
  });

  describe('getNextFollowUpTime', () => {
    /**
     * Task 8.1: 次の追いリマインド時刻を取得
     */
    it('次の追いリマインド時刻を返す（未送信の場合）', async () => {
      const userId = 'test-user-123';
      const currentTime = new Date('2024-01-15T13:30:00Z'); // JST 22:30

      // モック: notification_settings
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
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

      // モック: notification_logs（当日のログなし）
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // モック: entries（記録なし）
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getNextFollowUpTime(userId, currentTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toBeNull();
      }
    });

    it('追いリマインドが無効の場合はnullを返す', async () => {
      const userId = 'test-user-123';
      const currentTime = new Date('2024-01-15T13:30:00Z');

      // モック: notification_settings（follow_up_enabled: false）
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          enabled: true,
          primary_time: '21:00',
          timezone: 'Asia/Tokyo',
          follow_up_enabled: false,
          follow_up_interval_minutes: 60,
          follow_up_max_count: 2,
          active_days: [0, 1, 2, 3, 4, 5, 6],
        },
        error: null,
      });

      const result = await getNextFollowUpTime(userId, currentTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('shouldSendFollowUp', () => {
    /**
     * Task 8.1: 追いリマインドを送信すべきか判定
     */
    it('未記録で送信回数が残っている場合はtrueを返す', async () => {
      const userId = 'test-user-123';
      const currentTime = new Date('2024-01-15T13:00:00Z'); // JST 22:00

      // モック: notification_settings
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
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

      // モック: notification_logs（メインリマインドのみ送信済み）
      mockSupabase.order.mockReturnValueOnce(mockSupabase);
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { type: 'main_reminder', sent_at: '2024-01-15T12:00:00Z' },
        ],
        error: null,
      });

      // モック: entries（記録なし）
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await shouldSendFollowUp(userId, currentTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.shouldSend).toBe(true);
        expect(result.value.followUpCount).toBe(1);
      }
    });

    it('記録済みの場合はshouldSend=falseでreason="already_recorded"を返す', async () => {
      const userId = 'test-user-123';
      const currentTime = new Date('2024-01-15T13:00:00Z');

      // モック: notification_settings
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
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

      // モック: notification_logs
      mockSupabase.order.mockReturnValueOnce(mockSupabase);
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // モック: entries（記録あり）
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ id: 'entry-1' }],
        error: null,
      });

      const result = await shouldSendFollowUp(userId, currentTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.shouldSend).toBe(false);
        expect(result.value.reason).toBe('already_recorded');
      }
    });

    /**
     * Task 8.1: followUpMaxCountに達した場合
     */
    it('maxCountに達した場合はshouldSend=falseでreason="max_count_reached"を返す', async () => {
      const userId = 'test-user-123';
      const currentTime = new Date('2024-01-15T15:00:00Z'); // JST 00:00

      // モック: notification_settings（maxCount: 2）
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
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

      // モック: notification_logs（追いリマインド2回送信済み）
      mockSupabase.order.mockReturnValueOnce(mockSupabase);
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { type: 'main_reminder', sent_at: '2024-01-15T12:00:00Z' },
          { type: 'chase_reminder', sent_at: '2024-01-15T13:00:00Z' },
          { type: 'chase_reminder', sent_at: '2024-01-15T14:00:00Z' },
        ],
        error: null,
      });

      // モック: entries（記録なし）
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await shouldSendFollowUp(userId, currentTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.shouldSend).toBe(false);
        expect(result.value.reason).toBe('max_count_reached');
      }
    });

    it('インターバル時間が経過していない場合はshouldSend=falseでreason="not_time_yet"を返す', async () => {
      const userId = 'test-user-123';
      // JST 21:30 = primaryTime(21:00) + 30分
      // 追いリマインド1回目は 21:00 + 60分 = 22:00 JST
      // なので21:30時点ではまだ送信時刻に達していない
      const currentTime = new Date('2024-01-15T12:30:00Z'); // UTC 12:30 = JST 21:30

      // モック: notification_settings
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: userId,
          enabled: true,
          primary_time: '21:00',
          timezone: 'Asia/Tokyo',
          follow_up_enabled: true,
          follow_up_interval_minutes: 60, // 60分間隔
          follow_up_max_count: 2,
          active_days: [0, 1, 2, 3, 4, 5, 6],
        },
        error: null,
      });

      // モック: notification_logs（メインリマインド送信済み、追いリマインドなし）
      // shouldSendFollowUp は notification_logs を order().limit() で呼ぶ
      mockSupabase.order.mockImplementationOnce(() => {
        // order() が呼ばれた後、limit() の結果を返す
        mockSupabase.limit.mockResolvedValueOnce({
          data: [
            { type: 'main_reminder', sent_at: '2024-01-15T12:00:00Z' },
          ],
          error: null,
        });
        return mockSupabase;
      });

      // モック: entries（記録なし）
      // entries は limit() だけで呼ばれる
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await shouldSendFollowUp(userId, currentTime);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.shouldSend).toBe(false);
        expect(result.value.reason).toBe('not_time_yet');
      }
    });
  });

  describe('cancelFollowUps', () => {
    /**
     * Task 8.2: 記録完了時のキャンセル処理
     */
    it('追いリマインドをキャンセルする', async () => {
      const userId = 'test-user-123';

      // モック: follow_up_cancellations への挿入
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'cancel-1',
          user_id: userId,
          cancelled_at: '2024-01-15T12:30:00Z',
          target_date: '2024-01-15',
        },
        error: null,
      });

      const result = await cancelFollowUps(userId);

      expect(result.ok).toBe(true);
    });

    /**
     * Task 8.2: キャンセル状態の管理
     */
    it('既にキャンセル済みの場合でも正常に処理する', async () => {
      const userId = 'test-user-123';

      // モック: 重複エラー（UNIQUE制約違反）
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      });

      const result = await cancelFollowUps(userId);

      // 既にキャンセル済みでも成功として扱う
      expect(result.ok).toBe(true);
    });
  });

  describe('FollowUpSchedule integration', () => {
    /**
     * スケジュール計算とshouldSendの統合テスト
     */
    it('スケジュールに基づいて正しく送信判定する', () => {
      const primaryTime = '21:00';
      const intervalMinutes = 60;
      const maxCount = 2;
      const timezone = 'Asia/Tokyo';

      // JST 21:00 (primaryTime) = UTC 12:00
      const baseDate = new Date('2024-01-15T12:00:00Z');
      // primaryTimestampは「その日のprimaryTime」のUTCタイムスタンプ
      // JST 2024-01-15 21:00 = UTC 2024-01-15 12:00
      const expectedPrimaryTimestamp = new Date('2024-01-15T12:00:00Z');

      const schedule = calculateFollowUpSchedule(
        primaryTime,
        intervalMinutes,
        maxCount,
        timezone,
        baseDate
      );

      // スケジュールが正しく生成されている
      expect(schedule.primaryTimestamp).toEqual(expectedPrimaryTimestamp);
      expect(schedule.followUpTimes).toHaveLength(maxCount);

      // 各追いリマインドの時刻が正しい
      // primaryTimestampからの相対時刻として計算される
      schedule.followUpTimes.forEach((followUp, index) => {
        const expectedMinutesAfter = intervalMinutes * (index + 1);
        const expectedTime = new Date(
          expectedPrimaryTimestamp.getTime() + expectedMinutesAfter * 60 * 1000
        );
        expect(followUp.scheduledTime).toEqual(expectedTime);
      });
    });
  });
});
