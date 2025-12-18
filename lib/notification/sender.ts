/**
 * 通知配信サービス (NotificationDispatcher / NotificationSender)
 *
 * Web Push APIを使用した通知送信処理を担当します。
 *
 * Requirements:
 * - 5.2: 全登録デバイスへの通知送信
 * - 5.1: タイムゾーン対応の配信時刻計算
 * - 3.4: 記録済みユーザーのスキップ判定
 * - 5.3: 無効購読（410 Gone）の検出
 */

import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import {
  getSubscriptions,
  removeInvalidSubscription,
  type PushSubscription,
} from './subscription';
import { logNotification } from './log';
import { getVapidConfig, validateVapidConfig } from './config';
import type { NotificationType } from './types';

/**
 * 通知ペイロード
 */
export interface NotificationPayload {
  /** 通知タイトル */
  title: string;
  /** 通知本文 */
  body: string;
  /** アイコンURL */
  icon?: string;
  /** バッジURL */
  badge?: string;
  /** 追加データ */
  data?: {
    /** クリック時の遷移先URL */
    url: string;
    /** 通知種別 */
    type: NotificationType | 'main' | 'follow_up_1' | 'follow_up_2';
    /** 通知ID */
    notificationId: string;
  };
}

/**
 * 送信結果
 */
export interface SendResult {
  /** 購読ID */
  subscriptionId: string;
  /** 送信成功フラグ */
  success: boolean;
  /** HTTPステータスコード */
  statusCode?: number;
  /** エラーメッセージ */
  error?: string;
  /** 購読を削除すべきか（410 Gone等） */
  shouldRemove?: boolean;
}

/**
 * 配信エラーの型
 */
export type DispatchError =
  | { type: 'NO_SUBSCRIPTIONS' }
  | { type: 'ALL_FAILED'; results: SendResult[] }
  | { type: 'VAPID_ERROR'; message: string };

/**
 * Result型
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * タイムゾーン判定用の設定
 */
interface NotificationTimeSettings {
  /** 配信時刻（HH:mm形式） */
  primaryTime: string;
  /** タイムゾーン（IANA形式） */
  timezone: string;
  /** 有効な曜日（0:日曜〜6:土曜） */
  activeDays: number[];
}

// VAPID詳細の設定（初回のみ）
let vapidConfigured = false;

/**
 * VAPID設定を初期化する
 */
function ensureVapidConfigured(): Result<void, DispatchError> {
  if (vapidConfigured) {
    return { ok: true, value: undefined };
  }

  const config = getVapidConfig();
  const validation = validateVapidConfig(config);

  if (!validation.isValid) {
    return {
      ok: false,
      error: {
        type: 'VAPID_ERROR',
        message: validation.errors.join(', '),
      },
    };
  }

  webpush.setVapidDetails(
    'mailto:support@hibioru.app',
    config.publicKey!,
    config.privateKey!
  );

  vapidConfigured = true;
  return { ok: true, value: undefined };
}

/**
 * 単一デバイスへ通知を送信する
 *
 * @param subscription - 購読情報
 * @param payload - 通知ペイロード
 * @returns 送信結果
 */
export async function sendNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<Result<SendResult, DispatchError>> {
  // VAPID設定の確認
  const vapidResult = ensureVapidConfigured();
  if (!vapidResult.ok) {
    return vapidResult;
  }

  // web-push用の購読オブジェクトを構築
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dhKey,
      auth: subscription.authKey,
    },
  };

  try {
    const response = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    return {
      ok: true,
      value: {
        subscriptionId: subscription.id,
        success: true,
        statusCode: response.statusCode,
      },
    };
  } catch (error: unknown) {
    // エラーオブジェクトの型を確認
    const webPushError = error as { statusCode?: number; body?: string; message?: string };
    const statusCode = webPushError.statusCode;

    // 410 Gone: 購読が無効（削除が必要）
    if (statusCode === 410) {
      return {
        ok: true,
        value: {
          subscriptionId: subscription.id,
          success: false,
          statusCode: 410,
          error: 'Subscription has expired or is no longer valid',
          shouldRemove: true,
        },
      };
    }

    // その他のエラー
    const errorMessage =
      webPushError.message ||
      webPushError.body ||
      'Unknown error';

    return {
      ok: true,
      value: {
        subscriptionId: subscription.id,
        success: false,
        statusCode,
        error: errorMessage,
      },
    };
  }
}

/**
 * ユーザーの全登録デバイスへ通知を送信する
 *
 * @param userId - ユーザーID
 * @param payload - 通知ペイロード
 * @returns 全デバイスへの送信結果
 */
export async function sendToAllDevices(
  userId: string,
  payload: NotificationPayload
): Promise<Result<SendResult[], DispatchError>> {
  // 購読情報を取得
  const subscriptionsResult = await getSubscriptions(userId);
  if (!subscriptionsResult.ok) {
    return {
      ok: false,
      error: {
        type: 'VAPID_ERROR',
        message: 'Failed to get subscriptions',
      },
    };
  }

  const subscriptions = subscriptionsResult.value;

  // 購読情報がない場合
  if (subscriptions.length === 0) {
    return {
      ok: false,
      error: { type: 'NO_SUBSCRIPTIONS' },
    };
  }

  // 全デバイスへ送信
  const results: SendResult[] = [];
  const removePromises: Promise<unknown>[] = [];

  for (const subscription of subscriptions) {
    const sendResult = await sendNotification(subscription, payload);

    if (sendResult.ok) {
      results.push(sendResult.value);

      // 無効な購読は削除
      if (sendResult.value.shouldRemove) {
        removePromises.push(
          removeInvalidSubscription(subscription.id, '410 Gone')
        );
      }
    } else {
      // VAPID設定エラーなどの場合
      results.push({
        subscriptionId: subscription.id,
        success: false,
        error: 'VAPID configuration error',
      });
    }
  }

  // 無効な購読の削除を待機
  if (removePromises.length > 0) {
    await Promise.all(removePromises);
  }

  // 全て失敗した場合
  const hasSuccess = results.some((r) => r.success);
  if (!hasSuccess) {
    return {
      ok: false,
      error: {
        type: 'ALL_FAILED',
        results,
      },
    };
  }

  return { ok: true, value: results };
}

/**
 * タイムゾーンを考慮して現在の曜日を取得する
 *
 * @param timezone - タイムゾーン（IANA形式）
 * @param currentTime - 現在時刻（UTC）
 * @returns 曜日（0:日曜〜6:土曜）
 */
export function getCurrentDayOfWeek(
  timezone: string,
  currentTime: Date
): number {
  // タイムゾーンを考慮した日付文字列を取得
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const weekdayStr = formatter.format(currentTime);

  // 曜日を数値に変換
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return weekdayMap[weekdayStr] ?? 0;
}

/**
 * 現在時刻がprimaryTimeと一致するかを判定する
 *
 * @param settings - 通知設定
 * @param currentTime - 現在時刻（UTC）
 * @returns 配信すべきタイミングであればtrue
 */
export function isTimeToSendNotification(
  settings: NotificationTimeSettings,
  currentTime: Date
): boolean {
  // タイムゾーンを考慮した現在時刻を取得
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(currentTime);

  const hourPart = parts.find((p) => p.type === 'hour');
  const minutePart = parts.find((p) => p.type === 'minute');

  if (!hourPart || !minutePart) {
    return false;
  }

  // 現在時刻（HH:mm形式）
  const currentTimeStr = `${hourPart.value.padStart(2, '0')}:${minutePart.value.padStart(2, '0')}`;

  // 時刻が一致しない場合
  if (currentTimeStr !== settings.primaryTime) {
    return false;
  }

  // 曜日チェック
  const dayOfWeek = getCurrentDayOfWeek(settings.timezone, currentTime);
  if (!settings.activeDays.includes(dayOfWeek)) {
    return false;
  }

  return true;
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

  // その日の開始時刻（タイムゾーンの00:00）をUTCに変換
  const startOfDayLocal = new Date(`${dateStr}T00:00:00`);
  const endOfDayLocal = new Date(`${dateStr}T23:59:59.999`);

  // Intlを使ってオフセットを計算
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  const offsetParts = offsetFormatter.formatToParts(currentTime);
  const offsetPart = offsetParts.find((p) => p.type === 'timeZoneName');
  const offsetStr = offsetPart?.value || '+00:00';

  // オフセットをパース（例: "GMT+9" -> 9時間）
  const offsetMatch = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? -1 : 1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = parseInt(offsetMatch[3] || '0', 10);
    offsetMinutes = sign * (hours * 60 + minutes);
  }

  // UTCに変換
  const startOfDay = new Date(startOfDayLocal.getTime() + offsetMinutes * 60 * 1000);
  const endOfDay = new Date(endOfDayLocal.getTime() + offsetMinutes * 60 * 1000);

  return { startOfDay, endOfDay };
}

/**
 * 記録済みユーザーのスキップ判定を行う
 *
 * @param userId - ユーザーID
 * @param currentTime - 現在時刻（UTC）
 * @param timezone - タイムゾーン（IANA形式）
 * @returns 記録済みの場合true
 */
export async function shouldSkipNotification(
  userId: string,
  currentTime: Date,
  timezone: string
): Promise<Result<boolean, { type: 'DATABASE_ERROR'; message: string }>> {
  try {
    const supabase = await createClient();

    // タイムゾーンを考慮した当日の範囲を計算
    const { startOfDay, endOfDay } = getDayBoundaries(timezone, currentTime);

    // 当日のエントリーが存在するかチェック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .limit(1);

    if (error) {
      return {
        ok: false,
        error: { type: 'DATABASE_ERROR', message: error.message },
      };
    }

    // エントリーが存在すればスキップ
    const hasEntry = data && data.length > 0;
    return { ok: true, value: hasEntry };
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
 * メイン通知を送信し、ログを記録する
 *
 * 記録済みユーザーはスキップし、全デバイスへ通知を送信します。
 *
 * @param userId - ユーザーID
 * @param payload - 通知ペイロード
 * @param timezone - タイムゾーン
 * @returns 送信結果
 */
export async function dispatchMainNotification(
  userId: string,
  payload: NotificationPayload,
  timezone: string
): Promise<Result<SendResult[] | 'skipped', DispatchError | { type: 'DATABASE_ERROR'; message: string }>> {
  const currentTime = new Date();

  // 記録済みかチェック
  const skipResult = await shouldSkipNotification(userId, currentTime, timezone);
  if (!skipResult.ok) {
    return skipResult;
  }

  if (skipResult.value) {
    // スキップをログに記録
    await logNotification({
      userId,
      type: 'main_reminder',
      result: 'skipped',
    });
    return { ok: true, value: 'skipped' };
  }

  // 通知を送信
  const sendResult = await sendToAllDevices(userId, payload);

  // ログを記録
  const logResult = sendResult.ok ? 'success' : 'failed';
  await logNotification({
    userId,
    type: 'main_reminder',
    result: logResult,
    errorMessage: sendResult.ok
      ? undefined
      : sendResult.error.type,
  });

  return sendResult;
}
