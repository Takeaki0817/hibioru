/**
 * 通知設定バリデーション
 *
 * 通知設定値のバリデーションを行います。
 *
 * Requirements: 2.4, 2.5, 2.6, 2.7
 * - primaryTimeの範囲チェック（00:00-23:59）
 * - followUpIntervalMinutesの範囲チェック（15-180分）
 * - followUpMaxCountの範囲チェック（1-3回）
 * - activeDaysの形式検証（0-6の配列）
 * - remindersの形式検証（最大5つ、時刻形式チェック）
 */

import type { Reminder } from '../types';

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージの配列 */
  errors: string[];
}

/**
 * 通知設定の入力値
 */
export interface NotificationSettingsInput {
  /** メインリマインド時刻（HH:mm形式） */
  primaryTime?: string;
  /** 追いリマインド間隔（分） */
  followUpIntervalMinutes?: number;
  /** 追いリマインド最大回数 */
  followUpMaxCount?: number;
  /** 通知を送信する曜日（0:日曜〜6:土曜） */
  activeDays?: number[];
  /** リマインド設定配列 */
  reminders?: Reminder[];
}

/**
 * 時刻形式の正規表現（HH:mm形式）
 * - 時: 00-23
 * - 分: 00-59
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * primaryTimeのバリデーション
 *
 * 有効な時刻形式: HH:mm（00:00〜23:59）
 *
 * @param time - 検証する時刻文字列
 * @returns バリデーション結果
 */
export function validatePrimaryTime(time: string): ValidationResult {
  const errors: string[] = [];

  if (!TIME_PATTERN.test(time)) {
    errors.push(
      'primaryTime must be in HH:mm format (00:00-23:59)'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * followUpIntervalMinutesのバリデーション
 *
 * 有効な範囲: 15〜180分の整数
 *
 * @param minutes - 検証する間隔（分）
 * @returns バリデーション結果
 */
export function validateFollowUpIntervalMinutes(minutes: number): ValidationResult {
  const errors: string[] = [];

  // 整数チェック
  if (!Number.isInteger(minutes)) {
    errors.push('followUpIntervalMinutes must be an integer');
    return { isValid: false, errors };
  }

  // 範囲チェック（15-180分）
  if (minutes < 15 || minutes > 180) {
    errors.push(
      'followUpIntervalMinutes must be between 15 and 180'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * followUpMaxCountのバリデーション
 *
 * 有効な範囲: 1〜5回の整数
 *
 * @param count - 検証する回数
 * @returns バリデーション結果
 */
export function validateFollowUpMaxCount(count: number): ValidationResult {
  const errors: string[] = [];

  // 整数チェック
  if (!Number.isInteger(count)) {
    errors.push('followUpMaxCount must be an integer');
    return { isValid: false, errors };
  }

  // 範囲チェック（1-5回）
  if (count < 1 || count > 5) {
    errors.push('followUpMaxCount must be between 1 and 5');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * activeDaysのバリデーション
 *
 * 有効な値: 0〜6の整数配列（重複なし）
 * - 0: 日曜日
 * - 1: 月曜日
 * - 2: 火曜日
 * - 3: 水曜日
 * - 4: 木曜日
 * - 5: 金曜日
 * - 6: 土曜日
 *
 * @param days - 検証する曜日配列
 * @returns バリデーション結果
 */
export function validateActiveDays(days: number[]): ValidationResult {
  const errors: string[] = [];

  // 各要素が0-6の整数かチェック
  for (const day of days) {
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      errors.push(
        'activeDays must contain only integers from 0 to 6'
      );
      return { isValid: false, errors };
    }
  }

  // 重複チェック
  const uniqueDays = new Set(days);
  if (uniqueDays.size !== days.length) {
    errors.push('activeDays must not contain duplicate values');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * remindersのバリデーション
 *
 * 有効な形式: 最大5つのReminder配列
 * 各Reminderは { time: string | null, enabled: boolean } の形式
 *
 * @param reminders - 検証するリマインド配列
 * @returns バリデーション結果
 */
export function validateReminders(reminders: Reminder[]): ValidationResult {
  const errors: string[] = [];

  // 配列チェック
  if (!Array.isArray(reminders)) {
    errors.push('reminders must be an array');
    return { isValid: false, errors };
  }

  // 最大5つまで
  if (reminders.length > 5) {
    errors.push('reminders must have at most 5 items');
  }

  // 各リマインドの検証
  for (let i = 0; i < reminders.length; i++) {
    const reminder = reminders[i];

    // enabled が boolean かチェック
    if (typeof reminder.enabled !== 'boolean') {
      errors.push(`reminders[${i}].enabled must be a boolean`);
    }

    // time が null または HH:mm 形式かチェック
    if (reminder.time !== null) {
      if (typeof reminder.time !== 'string') {
        errors.push(`reminders[${i}].time must be a string or null`);
      } else if (!TIME_PATTERN.test(reminder.time)) {
        errors.push(
          `reminders[${i}].time must be in HH:mm format (00:00-23:59)`
        );
      }
    }

    // enabled が true なら time は必須
    if (reminder.enabled && reminder.time === null) {
      errors.push(
        `reminders[${i}].time is required when enabled is true`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 通知設定全体のバリデーション
 *
 * 指定された設定項目のみをバリデーションします。
 * 指定されていない項目はスキップされます。
 *
 * @param settings - 検証する通知設定
 * @returns バリデーション結果
 */
export function validateNotificationSettings(
  settings: Partial<NotificationSettingsInput>
): ValidationResult {
  const errors: string[] = [];

  // primaryTimeのバリデーション
  if (settings.primaryTime !== undefined) {
    const result = validatePrimaryTime(settings.primaryTime);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }

  // followUpIntervalMinutesのバリデーション
  if (settings.followUpIntervalMinutes !== undefined) {
    const result = validateFollowUpIntervalMinutes(settings.followUpIntervalMinutes);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }

  // followUpMaxCountのバリデーション
  if (settings.followUpMaxCount !== undefined) {
    const result = validateFollowUpMaxCount(settings.followUpMaxCount);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }

  // activeDaysのバリデーション
  if (settings.activeDays !== undefined) {
    const result = validateActiveDays(settings.activeDays);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }

  // remindersのバリデーション
  if (settings.reminders !== undefined) {
    const result = validateReminders(settings.reminders);
    if (!result.isValid) {
      errors.push(...result.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
