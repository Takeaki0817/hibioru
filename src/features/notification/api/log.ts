/**
 * 通知ログサービス (NotificationLogService)
 *
 * 通知送信ログの記録・管理を行います。
 *
 * Requirements:
 * - 3.3, 3.5: 送信ログの記録（成功・失敗・スキップ）
 * - 4.5: 追いリマインドログの記録
 * - 6.1, 6.2: 記録追跡機能（entry_recorded_at更新）
 * - 6.3: 90日経過したログの自動削除
 */

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/types/result'
import type { NotificationType, NotificationResult } from '../types'

export type { Result }

/**
 * 通知ログの入力
 */
export interface NotificationLogInput {
  /** ユーザーID */
  userId: string;
  /** 通知種別 */
  type: NotificationType;
  /** 送信結果 */
  result: NotificationResult;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
}

/**
 * 通知ログ
 */
export interface NotificationLog {
  /** ログID */
  id: string;
  /** ユーザーID */
  userId: string;
  /** 通知種別 */
  type: NotificationType;
  /** 送信日時 */
  sentAt: Date;
  /** 送信結果 */
  result: NotificationResult;
  /** エラーメッセージ */
  errorMessage: string | null;
  /** エントリー記録日時（通知後に記録された場合） */
  entryRecordedAt: Date | null;
}

/**
 * ログエラーの型
 */
export type LogError = {
  type: 'DATABASE_ERROR'
  message: string
}

/**
 * 通知送信ログを記録する
 *
 * 通知の送信結果（成功・失敗・スキップ）をデータベースに記録します。
 *
 * @param log - ログ入力
 * @returns 記録結果
 */
export async function logNotification(
  log: NotificationLogInput
): Promise<Result<NotificationLog, LogError>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: log.userId,
        type: log.type,
        result: log.result,
        error_message: log.errorMessage ?? null,
      })
      .select()
      .single();

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      };
    }

    return {
      ok: true,
      value: {
        id: data.id,
        userId: data.user_id,
        type: data.type as NotificationType,
        sentAt: new Date(data.sent_at),
        result: data.result as NotificationResult,
        errorMessage: data.error_message,
        entryRecordedAt: data.entry_recorded_at
          ? new Date(data.entry_recorded_at)
          : null,
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
 * 通知後のエントリー作成時刻を更新する
 *
 * 当日の通知ログにentry_recorded_atを設定し、
 * 応答時間（sent_at〜entry_recorded_at）の計算を可能にします。
 *
 * @param userId - ユーザーID
 * @param entryCreatedAt - エントリー作成日時
 * @returns 更新結果
 */
export async function updateEntryRecorded(
  userId: string,
  entryCreatedAt: Date
): Promise<Result<void, LogError>> {
  try {
    const supabase = await createClient();

    // 当日の範囲を計算（UTC 0:00〜23:59:59）
    const startOfDay = new Date(entryCreatedAt);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(entryCreatedAt);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 当日のまだentry_recorded_atが設定されていない通知ログを更新
    const { error } = await supabase
      .from('notification_logs')
      .update({ entry_recorded_at: entryCreatedAt.toISOString() })
      .is('entry_recorded_at', null)
      .eq('user_id', userId)
      .gte('sent_at', startOfDay.toISOString())
      .lt('sent_at', endOfDay.toISOString());

    if (error) {
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
 * 指定日数経過したログを削除する
 *
 * 90日経過したログを削除し、ストレージを最適化します。
 * pg_cronから毎日実行されることを想定しています。
 *
 * @param retentionDays - 保持日数（デフォルト: 90日）
 * @returns 削除された件数
 */
export async function cleanupOldLogs(
  retentionDays: number = 90
): Promise<Result<number, LogError>> {
  try {
    const supabase = await createClient();

    // 保持日数前の日時を計算
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { error, count } = await supabase
      .from('notification_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      };
    }

    return { ok: true, value: count ?? 0 };
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
