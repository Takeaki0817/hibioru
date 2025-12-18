/**
 * 追いリマインドスケジューラ (FollowUpScheduler)
 *
 * 追いリマインドのスケジュール管理を行います。
 *
 * Requirements:
 * - 4.1: primaryTime後の追いリマインドスケジュール計算
 * - 4.4: 記録完了時の追いリマインドキャンセル
 * - 4.6: followUpMaxCountに基づく送信制限
 */

import { createClient } from '@/lib/supabase/server';
import type { NotificationType } from './types';

/**
 * Result型
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * スケジューラエラーの型
 */
export type SchedulerError =
  | { type: 'USER_NOT_FOUND' }
  | { type: 'SETTINGS_NOT_FOUND' }
  | { type: 'DATABASE_ERROR'; message: string };

/**
 * 追いリマインドの送信判定結果
 */
export interface FollowUpDecision {
  /** 送信すべきか */
  shouldSend: boolean;
  /** 追いリマインド回数（1 or 2 or 3） */
  followUpCount: number;
  /** 送信しない理由 */
  reason?: 'already_recorded' | 'max_count_reached' | 'not_time_yet' | 'disabled';
}

/**
 * 追いリマインドの予定時刻
 */
export interface FollowUpTime {
  /** 追いリマインド番号（1, 2, 3...） */
  followUpNumber: number;
  /** 予定時刻 */
  scheduledTime: Date;
  /** 通知タイプ */
  notificationType: NotificationType;
}

/**
 * 追いリマインドスケジュール
 */
export interface FollowUpSchedule {
  /** primaryTime（メインリマインド送信時刻） */
  primaryTimestamp: Date;
  /** 追いリマインドの予定時刻リスト */
  followUpTimes: FollowUpTime[];
}

/**
 * 通知設定（DBから取得）
 */
interface NotificationSettingsRow {
  user_id: string;
  enabled: boolean;
  primary_time: string;
  timezone: string;
  follow_up_enabled: boolean;
  follow_up_interval_minutes: number;
  follow_up_max_count: number;
  active_days: number[];
}

/**
 * 通知ログ（DBから取得）
 */
interface NotificationLogRow {
  type: string;
  sent_at: string;
}

/**
 * primaryTimeから追いリマインドのスケジュールを計算する
 *
 * 純粋関数として、データベースアクセスなしでスケジュールを計算します。
 *
 * @param primaryTime - メインリマインド時刻（HH:mm形式）
 * @param intervalMinutes - 追いリマインドの間隔（分）
 * @param maxCount - 追いリマインドの最大回数
 * @param timezone - タイムゾーン（IANA形式）
 * @param baseDate - 基準日時（デフォルト: 現在時刻）
 * @returns 追いリマインドスケジュール
 */
export function calculateFollowUpSchedule(
  primaryTime: string,
  intervalMinutes: number,
  maxCount: number,
  timezone: string,
  baseDate: Date = new Date()
): FollowUpSchedule {
  // タイムゾーンを考慮してprimaryTimeのタイムスタンプを計算
  const primaryTimestamp = calculatePrimaryTimestamp(
    primaryTime,
    timezone,
    baseDate
  );

  // 追いリマインドの予定時刻を計算
  const followUpTimes: FollowUpTime[] = [];

  for (let i = 1; i <= maxCount; i++) {
    const minutesAfterPrimary = intervalMinutes * i;
    const scheduledTime = new Date(
      primaryTimestamp.getTime() + minutesAfterPrimary * 60 * 1000
    );

    // 通知タイプを決定（1回目: chase_reminder、2回目以降も chase_reminder）
    const notificationType: NotificationType = 'chase_reminder';

    followUpTimes.push({
      followUpNumber: i,
      scheduledTime,
      notificationType,
    });
  }

  return {
    primaryTimestamp,
    followUpTimes,
  };
}

/**
 * primaryTimeのタイムスタンプを計算する（内部関数）
 *
 * baseDateの日付（指定タイムゾーン基準）におけるprimaryTimeのUTC時刻を計算します。
 *
 * @param primaryTime - メインリマインド時刻（HH:mm形式）
 * @param timezone - タイムゾーン（IANA形式）
 * @param baseDate - 基準日時
 * @returns primaryTimeのタイムスタンプ（UTC）
 */
function calculatePrimaryTimestamp(
  primaryTime: string,
  timezone: string,
  baseDate: Date
): Date {
  // タイムゾーンを考慮した日付を取得
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(baseDate);

  // primaryTimeを分解
  const [hours, minutes] = primaryTime.split(':').map(Number);

  // タイムゾーンのオフセットを計算
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, baseDate);

  // UTCでの基準時刻を計算（dateStrの日付の00:00 UTC）
  const utcMidnight = new Date(`${dateStr}T00:00:00Z`);

  // primaryTimeの分数を追加
  const primaryMinutes = hours * 60 + minutes;

  // タイムゾーンのオフセットを考慮してUTCに変換
  // 例: JST 21:00 = UTC 12:00 (JST = UTC + 9時間)
  // primaryMinutes = 21 * 60 = 1260分
  // offsetMinutes = 9 * 60 = 540分 (JSTはUTC+9)
  // UTC時刻 = primaryMinutes - offsetMinutes = 1260 - 540 = 720分 = 12:00
  const utcMinutes = primaryMinutes - offsetMinutes;

  const utcTimestamp = new Date(utcMidnight.getTime() + utcMinutes * 60 * 1000);

  return utcTimestamp;
}

/**
 * タイムゾーンのオフセットを分単位で取得する（内部関数）
 *
 * @param timezone - タイムゾーン（IANA形式）
 * @param date - 基準日時
 * @returns オフセット（分）、UTCより東はプラス
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  // Intlを使ってオフセットを計算
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  const offsetParts = offsetFormatter.formatToParts(date);
  const offsetPart = offsetParts.find((p) => p.type === 'timeZoneName');
  const offsetStr = offsetPart?.value || 'GMT+0';

  // オフセットをパース（例: "GMT+9" -> 540分）
  const offsetMatch = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!offsetMatch) {
    return 0;
  }

  const sign = offsetMatch[1] === '+' ? 1 : -1;
  const hours = parseInt(offsetMatch[2], 10);
  const minutes = parseInt(offsetMatch[3] || '0', 10);

  return sign * (hours * 60 + minutes);
}

/**
 * タイムゾーンを考慮してその日の開始・終了時刻を取得する
 *
 * @param timezone - タイムゾーン（IANA形式）
 * @param currentTime - 現在時刻（UTC）
 * @returns その日の開始時刻と終了時刻（UTC）
 */
function getDayBoundaries(
  timezone: string,
  currentTime: Date
): { startOfDay: Date; endOfDay: Date } {
  // タイムゾーンを考慮した日付を取得
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(currentTime);

  // オフセットを取得
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, currentTime);

  // その日の開始時刻（ローカル00:00）をUTCに変換
  const startOfDayLocal = new Date(`${dateStr}T00:00:00`);
  const startOfDay = new Date(startOfDayLocal.getTime() - offsetMinutes * 60 * 1000);

  // その日の終了時刻（ローカル23:59:59.999）をUTCに変換
  const endOfDayLocal = new Date(`${dateStr}T23:59:59.999`);
  const endOfDay = new Date(endOfDayLocal.getTime() - offsetMinutes * 60 * 1000);

  return { startOfDay, endOfDay };
}

/**
 * 次の追いリマインド時刻を取得する
 *
 * ユーザーの設定と送信履歴に基づいて、次の追いリマインドの送信時刻を計算します。
 *
 * @param userId - ユーザーID
 * @param currentTime - 現在時刻（デフォルト: 現在時刻）
 * @returns 次の追いリマインド時刻（送信すべきでない場合はnull）
 */
export async function getNextFollowUpTime(
  userId: string,
  currentTime: Date = new Date()
): Promise<Result<Date | null, SchedulerError>> {
  try {
    const supabase = await createClient();

    // 通知設定を取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settingsData, error: settingsError } = await (supabase as any)
      .from('notification_settings')
      .select()
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      if (settingsError.code === 'PGRST116') {
        return {
          ok: false,
          error: { type: 'SETTINGS_NOT_FOUND' },
        };
      }
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: settingsError.message },
      };
    }

    const settings = settingsData as NotificationSettingsRow;

    // 追いリマインドが無効の場合
    if (!settings.follow_up_enabled) {
      return { ok: true, value: null };
    }

    // スケジュールを計算
    const schedule = calculateFollowUpSchedule(
      settings.primary_time,
      settings.follow_up_interval_minutes,
      settings.follow_up_max_count,
      settings.timezone,
      currentTime
    );

    // 当日の送信履歴を取得
    const { startOfDay, endOfDay } = getDayBoundaries(settings.timezone, currentTime);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logsData, error: logsError } = await (supabase as any)
      .from('notification_logs')
      .select('type, sent_at')
      .eq('user_id', userId)
      .gte('sent_at', startOfDay.toISOString())
      .lt('sent_at', endOfDay.toISOString())
      .limit(10);

    if (logsError) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: logsError.message },
      };
    }

    const logs = (logsData || []) as NotificationLogRow[];

    // 送信済みの追いリマインド回数をカウント
    const chaseReminderCount = logs.filter(
      (log) => log.type === 'chase_reminder'
    ).length;

    // maxCountに達している場合
    if (chaseReminderCount >= settings.follow_up_max_count) {
      return { ok: true, value: null };
    }

    // 記録済みかチェック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entriesData, error: entriesError } = await (supabase as any)
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .limit(1);

    if (entriesError) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: entriesError.message },
      };
    }

    // 記録済みの場合
    if (entriesData && entriesData.length > 0) {
      return { ok: true, value: null };
    }

    // 次の追いリマインド時刻を取得
    const nextFollowUp = schedule.followUpTimes[chaseReminderCount];
    if (!nextFollowUp) {
      return { ok: true, value: null };
    }

    return { ok: true, value: nextFollowUp.scheduledTime };
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    };
  }
}

/**
 * 追いリマインドを送信すべきか判定する
 *
 * 現在時刻、設定、送信履歴、記録状況に基づいて判定します。
 *
 * @param userId - ユーザーID
 * @param currentTime - 現在時刻（デフォルト: 現在時刻）
 * @returns 送信判定結果
 */
export async function shouldSendFollowUp(
  userId: string,
  currentTime: Date = new Date()
): Promise<Result<FollowUpDecision, SchedulerError>> {
  try {
    const supabase = await createClient();

    // 通知設定を取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settingsData, error: settingsError } = await (supabase as any)
      .from('notification_settings')
      .select()
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      if (settingsError.code === 'PGRST116') {
        return {
          ok: false,
          error: { type: 'SETTINGS_NOT_FOUND' },
        };
      }
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: settingsError.message },
      };
    }

    const settings = settingsData as NotificationSettingsRow;

    // 追いリマインドが無効の場合
    if (!settings.follow_up_enabled) {
      return {
        ok: true,
        value: {
          shouldSend: false,
          followUpCount: 0,
          reason: 'disabled',
        },
      };
    }

    // タイムゾーン考慮した当日の範囲を取得
    const { startOfDay, endOfDay } = getDayBoundaries(settings.timezone, currentTime);

    // 当日の送信履歴を取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logsData, error: logsError } = await (supabase as any)
      .from('notification_logs')
      .select('type, sent_at')
      .eq('user_id', userId)
      .gte('sent_at', startOfDay.toISOString())
      .lt('sent_at', endOfDay.toISOString())
      .order('sent_at', { ascending: true })
      .limit(10);

    if (logsError) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: logsError.message },
      };
    }

    const logs = (logsData || []) as NotificationLogRow[];

    // 送信済みの追いリマインド回数をカウント
    const chaseReminderCount = logs.filter(
      (log) => log.type === 'chase_reminder'
    ).length;

    // maxCountに達している場合
    if (chaseReminderCount >= settings.follow_up_max_count) {
      return {
        ok: true,
        value: {
          shouldSend: false,
          followUpCount: chaseReminderCount,
          reason: 'max_count_reached',
        },
      };
    }

    // 記録済みかチェック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entriesData, error: entriesError } = await (supabase as any)
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .limit(1);

    if (entriesError) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: entriesError.message },
      };
    }

    // 記録済みの場合
    if (entriesData && entriesData.length > 0) {
      return {
        ok: true,
        value: {
          shouldSend: false,
          followUpCount: chaseReminderCount,
          reason: 'already_recorded',
        },
      };
    }

    // スケジュールを計算
    const schedule = calculateFollowUpSchedule(
      settings.primary_time,
      settings.follow_up_interval_minutes,
      settings.follow_up_max_count,
      settings.timezone,
      currentTime
    );

    // 次の追いリマインド番号
    const nextFollowUpNumber = chaseReminderCount + 1;

    // 次の追いリマインド予定時刻を取得
    const nextFollowUp = schedule.followUpTimes[chaseReminderCount];
    if (!nextFollowUp) {
      return {
        ok: true,
        value: {
          shouldSend: false,
          followUpCount: chaseReminderCount,
          reason: 'max_count_reached',
        },
      };
    }

    // 予定時刻に達しているかチェック
    if (currentTime < nextFollowUp.scheduledTime) {
      return {
        ok: true,
        value: {
          shouldSend: false,
          followUpCount: nextFollowUpNumber,
          reason: 'not_time_yet',
        },
      };
    }

    // 送信すべき
    return {
      ok: true,
      value: {
        shouldSend: true,
        followUpCount: nextFollowUpNumber,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    };
  }
}

/**
 * 追いリマインドをキャンセルする
 *
 * ユーザーが記録を完了した際に、予定されていた追いリマインドをキャンセルします。
 * キャンセル状態はfollow_up_cancellationsテーブルで管理されます。
 *
 * @param userId - ユーザーID
 * @param targetDate - キャンセル対象の日付（デフォルト: 今日）
 * @returns キャンセル結果
 */
export async function cancelFollowUps(
  userId: string,
  targetDate: Date = new Date()
): Promise<Result<void, SchedulerError>> {
  try {
    const supabase = await createClient();

    // 日付文字列を作成（YYYY-MM-DD形式）
    const dateStr = targetDate.toISOString().split('T')[0];

    // キャンセルレコードを挿入（既に存在する場合は無視）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('follow_up_cancellations')
      .insert({
        user_id: userId,
        target_date: dateStr,
        cancelled_at: new Date().toISOString(),
      })
      .single();

    // UNIQUE制約違反は「既にキャンセル済み」を意味するので成功として扱う
    if (error && error.code !== '23505') {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      };
    }

    return { ok: true, value: undefined };
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    };
  }
}

/**
 * 追いリマインドがキャンセルされているか確認する
 *
 * @param userId - ユーザーID
 * @param targetDate - 確認対象の日付（デフォルト: 今日）
 * @returns キャンセルされている場合true
 */
export async function isFollowUpCancelled(
  userId: string,
  targetDate: Date = new Date()
): Promise<Result<boolean, SchedulerError>> {
  try {
    const supabase = await createClient();

    // 日付文字列を作成（YYYY-MM-DD形式）
    const dateStr = targetDate.toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('follow_up_cancellations')
      .select('id')
      .eq('user_id', userId)
      .eq('target_date', dateStr)
      .limit(1);

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      };
    }

    return { ok: true, value: data && data.length > 0 };
  } catch (error) {
    return {
      ok: false,
      error: {
        type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    };
  }
}
