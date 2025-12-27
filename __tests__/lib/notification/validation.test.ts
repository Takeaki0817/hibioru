/**
 * 通知設定バリデーションのテスト
 *
 * Requirements: 2.4, 2.5, 2.6, 2.7
 * - primaryTimeの範囲チェック（00:00-23:59）
 * - followUpIntervalMinutesの範囲チェック（15-180分）
 * - followUpMaxCountの範囲チェック（1-5回）
 * - activeDaysの形式検証（0-6の配列）
 */

import {
  validatePrimaryTime,
  validateFollowUpIntervalMinutes,
  validateFollowUpMaxCount,
  validateActiveDays,
  validateNotificationSettings,
  type ValidationResult,
  type NotificationSettingsInput,
} from '@/features/notification/api/validation';

describe('通知設定バリデーション', () => {
  describe('validatePrimaryTime', () => {
    describe('有効な時刻', () => {
      it.each([
        ['00:00', '深夜0時'],
        ['12:00', '正午'],
        ['23:59', '23時59分'],
        ['21:00', 'デフォルト値'],
        ['09:30', '9時30分'],
        ['15:45', '15時45分'],
      ])('%s は有効な時刻（%s）', (time) => {
        const result = validatePrimaryTime(time);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('無効な時刻', () => {
      it.each([
        ['24:00', '24時は無効'],
        ['25:00', '25時は無効'],
        ['-1:00', '負の値は無効'],
        ['12:60', '60分は無効'],
        ['12:99', '99分は無効'],
        ['1:00', '1桁の時は無効（01:00が必要）'],
        ['01:0', '1桁の分は無効（01:00が必要）'],
        ['', '空文字は無効'],
        ['abc', '文字列は無効'],
        ['12', '時のみは無効'],
        ['12:00:00', '秒を含む形式は無効'],
        ['12-00', '区切り文字が違う形式は無効'],
      ])('%s は無効な時刻（%s）', (time) => {
        const result = validatePrimaryTime(time);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateFollowUpIntervalMinutes', () => {
    describe('有効な間隔', () => {
      it.each([
        [15, '最小値'],
        [60, 'デフォルト値'],
        [90, '中間値'],
        [180, '最大値'],
        [30, '30分'],
        [120, '120分'],
      ])('%d分 は有効な間隔（%s）', (minutes) => {
        const result = validateFollowUpIntervalMinutes(minutes);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('無効な間隔', () => {
      it.each([
        [14, '15分未満は無効'],
        [0, '0分は無効'],
        [-1, '負の値は無効'],
        [181, '180分超過は無効'],
        [200, '200分は無効'],
        [10, '10分は無効'],
      ])('%d分 は無効な間隔（%s）', (minutes) => {
        const result = validateFollowUpIntervalMinutes(minutes);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('小数は無効', () => {
      const result = validateFollowUpIntervalMinutes(30.5);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateFollowUpMaxCount', () => {
    describe('有効な回数', () => {
      it.each([
        [1, '最小値'],
        [2, 'デフォルト値'],
        [3, '中間値'],
        [4, '4回'],
        [5, '最大値'],
      ])('%d回 は有効な回数（%s）', (count) => {
        const result = validateFollowUpMaxCount(count);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('無効な回数', () => {
      it.each([
        [0, '0回は無効'],
        [-1, '負の値は無効'],
        [6, '6回は無効（上限超過）'],
        [10, '10回は無効'],
      ])('%d回 は無効な回数（%s）', (count) => {
        const result = validateFollowUpMaxCount(count);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('小数は無効', () => {
      const result = validateFollowUpMaxCount(1.5);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateActiveDays', () => {
    describe('有効な曜日配列', () => {
      it.each([
        [[0, 1, 2, 3, 4, 5, 6], '全曜日'],
        [[0], '日曜のみ'],
        [[1, 2, 3, 4, 5], '平日のみ'],
        [[0, 6], '週末のみ'],
        [[1], '月曜のみ'],
        [[6], '土曜のみ'],
        [[], '空配列（全曜日無効）'],
      ])('%j は有効な曜日配列（%s）', (days) => {
        const result = validateActiveDays(days);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('無効な曜日配列', () => {
      it.each([
        [[-1], '負の値は無効'],
        [[7], '7以上は無効'],
        [[0, 7], '一部が無効'],
        [[0, 1, 2, 3, 4, 5, 6, 7], '7を含む'],
        [[0, 0], '重複は無効'],
        [[1, 2, 2, 3], '重複を含む'],
      ])('%j は無効な曜日配列（%s）', (days) => {
        const result = validateActiveDays(days);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('小数を含む配列は無効', () => {
      const result = validateActiveDays([1.5, 2]);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateNotificationSettings', () => {
    it('すべての設定が有効な場合は成功を返す', () => {
      const settings: NotificationSettingsInput = {
        primaryTime: '21:00',
        followUpIntervalMinutes: 60,
        followUpMaxCount: 2,
        activeDays: [0, 1, 2, 3, 4, 5, 6],
      };

      const result = validateNotificationSettings(settings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('複数の無効な設定がある場合はすべてのエラーを返す', () => {
      const settings: NotificationSettingsInput = {
        primaryTime: '25:00',
        followUpIntervalMinutes: 10,
        followUpMaxCount: 6,  // 6は無効（上限超過）
        activeDays: [0, 7],
      };

      const result = validateNotificationSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(4);
    });

    it('部分的な設定のみを検証できる', () => {
      const settings: Partial<NotificationSettingsInput> = {
        primaryTime: '21:00',
      };

      const result = validateNotificationSettings(settings);
      expect(result.isValid).toBe(true);
    });

    it('空オブジェクトは有効', () => {
      const result = validateNotificationSettings({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('エラーには該当フィールド名が含まれる', () => {
      const settings: NotificationSettingsInput = {
        primaryTime: 'invalid',
        followUpIntervalMinutes: 10,
        followUpMaxCount: 6,  // 6は無効（上限超過）
        activeDays: [7],
      };

      const result = validateNotificationSettings(settings);

      // 各エラーにフィールド名が含まれていることを確認
      expect(result.errors.some((e) => e.includes('primaryTime'))).toBe(true);
      expect(result.errors.some((e) => e.includes('followUpIntervalMinutes'))).toBe(true);
      expect(result.errors.some((e) => e.includes('followUpMaxCount'))).toBe(true);
      expect(result.errors.some((e) => e.includes('activeDays'))).toBe(true);
    });
  });
});
