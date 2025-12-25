/**
 * 通知配信Edge Function
 *
 * pg_cronから毎分トリガーされ、配信対象ユーザーを特定して通知を送信します。
 *
 * タスク11.1: 通知配信Edge Functionの作成
 *
 * Requirements:
 * - 3.1: メインリマインド送信
 * - 4.1: 追いリマインドスケジュール
 * - 5.1: タイムゾーン対応の配信時刻計算
 * - 5.4: 非同期実行（バックグラウンドジョブ）
 *
 * 実行タイミング: pg_cronにより毎分実行
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

// Deno Deploy用のコアモジュール
Deno.serve(async (req: Request) => {
  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Service Role Keyの検証
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const providedKey = authHeader.replace('Bearer ', '');
    if (providedKey !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid service role key' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Supabaseクライアント（Service Role）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    // VAPID設定
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys are not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(
      'mailto:support@hibioru.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const currentTimeUtc = new Date();
    const results = {
      mainReminders: { sent: 0, skipped: 0, failed: 0 },
      chaseReminders: { sent: 0, skipped: 0, failed: 0 },
      errors: [] as string[],
    };

    // メインリマインド配信対象を取得・送信
    const mainResults = await processMainReminders(supabase, currentTimeUtc);
    results.mainReminders = mainResults;

    // 追いリマインド配信対象を取得・送信
    const chaseResults = await processChaseReminders(supabase, currentTimeUtc);
    results.chaseReminders = chaseResults;

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: currentTimeUtc.toISOString(),
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-notifications:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ==================
// 型定義
// ==================

interface Reminder {
  time: string | null;
  enabled: boolean;
}

interface NotificationSettings {
  user_id: string;
  enabled: boolean;
  main_reminder_time: string;
  reminders: Reminder[];
  timezone: string;
  chase_reminder_enabled: boolean;
  chase_reminder_delay_minutes: number;
  follow_up_max_count: number;
  active_days: number[];
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationLog {
  user_id: string;
  type: string;
  sent_at: string;
}

interface SendStats {
  sent: number;
  skipped: number;
  failed: number;
}

// ==================
// メインリマインド処理
// ==================

/**
 * メインリマインドの配信処理
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMainReminders(supabase: any, currentTimeUtc: Date): Promise<SendStats> {
  const stats: SendStats = { sent: 0, skipped: 0, failed: 0 };

  // 1. 通知設定を全て取得（有効なもののみ）
  const { data: settings, error: settingsError } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('enabled', true);

  if (settingsError) {
    console.error('Failed to fetch notification settings:', settingsError);
    return stats;
  }

  if (!settings || settings.length === 0) {
    return stats;
  }

  // 2. 配信対象ユーザーを特定
  const targets = findMainNotificationTargets(settings, currentTimeUtc);

  for (const target of targets) {
    try {
      // 3. 同一分内の重複チェック
      const isDuplicate = await checkDuplicateInDatabase(
        supabase,
        target.user_id,
        'main_reminder',
        currentTimeUtc
      );

      if (isDuplicate) {
        stats.skipped++;
        continue;
      }

      // 4. 購読情報を取得
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', target.user_id);

      if (!subscriptions || subscriptions.length === 0) {
        stats.skipped++;
        continue;
      }

      // 6. 通知を送信
      const payload = getMainReminderPayload();
      const sendResult = await sendNotifications(supabase, subscriptions, payload);

      if (sendResult.success) {
        await logNotification(supabase, target.user_id, 'main_reminder', 'success');
        stats.sent++;
      } else {
        await logNotification(supabase, target.user_id, 'main_reminder', 'failed', sendResult.error);
        stats.failed++;
      }
    } catch (error) {
      console.error(`Failed to process main reminder for user ${target.user_id}:`, error);
      stats.failed++;
    }
  }

  return stats;
}

// ==================
// 追いリマインド処理
// ==================

/**
 * 追いリマインドの配信処理
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processChaseReminders(supabase: any, currentTimeUtc: Date): Promise<SendStats> {
  const stats: SendStats = { sent: 0, skipped: 0, failed: 0 };

  // 1. 追いリマインドが有効な設定を取得
  const { data: settings, error: settingsError } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('enabled', true)
    .eq('chase_reminder_enabled', true);

  if (settingsError) {
    console.error('Failed to fetch notification settings:', settingsError);
    return stats;
  }

  if (!settings || settings.length === 0) {
    return stats;
  }

  for (const setting of settings as NotificationSettings[]) {
    try {
      // 2. タイムゾーンを考慮した当日の範囲を取得
      const { startOfDay, endOfDay } = getDayBoundaries(setting.timezone, currentTimeUtc);

      // 3. 当日の送信履歴を取得
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('type, sent_at')
        .eq('user_id', setting.user_id)
        .gte('sent_at', startOfDay.toISOString())
        .lt('sent_at', endOfDay.toISOString())
        .order('sent_at', { ascending: true });

      const mainReminderLog = (logs || []).find(
        (log: NotificationLog) => log.type === 'main_reminder'
      );

      // メインリマインドが送信されていない場合はスキップ
      if (!mainReminderLog) {
        continue;
      }

      // 4. 追いリマインド送信回数をカウント
      const chaseReminderCount = (logs || []).filter(
        (log: NotificationLog) => log.type === 'chase_reminder'
      ).length;

      // maxCountに達している場合はスキップ
      if (chaseReminderCount >= setting.follow_up_max_count) {
        stats.skipped++;
        continue;
      }

      // 6. 予定時刻を計算
      const mainSentAt = new Date(mainReminderLog.sent_at);
      const nextFollowUpNumber = chaseReminderCount + 1;
      const expectedTime = new Date(
        mainSentAt.getTime() +
          nextFollowUpNumber * setting.chase_reminder_delay_minutes * 60 * 1000
      );

      // 予定時刻に達していない場合はスキップ
      if (currentTimeUtc < expectedTime) {
        continue;
      }

      // 7. 同一分内の重複チェック
      const isDuplicate = await checkDuplicateInDatabase(
        supabase,
        setting.user_id,
        'chase_reminder',
        currentTimeUtc
      );

      if (isDuplicate) {
        stats.skipped++;
        continue;
      }

      // 8. 購読情報を取得
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', setting.user_id);

      if (!subscriptions || subscriptions.length === 0) {
        stats.skipped++;
        continue;
      }

      // 9. 通知を送信
      const payload = getChaseReminderPayload(nextFollowUpNumber);
      const sendResult = await sendNotifications(supabase, subscriptions, payload);

      if (sendResult.success) {
        await logNotification(supabase, setting.user_id, 'chase_reminder', 'success');
        stats.sent++;
      } else {
        await logNotification(supabase, setting.user_id, 'chase_reminder', 'failed', sendResult.error);
        stats.failed++;
      }
    } catch (error) {
      console.error(`Failed to process chase reminder for user ${setting.user_id}:`, error);
      stats.failed++;
    }
  }

  return stats;
}

// ==================
// ヘルパー関数
// ==================

/**
 * メインリマインド配信対象を特定する
 * reminders配列内の有効なリマインドの時刻をチェック
 */
function findMainNotificationTargets(
  settings: NotificationSettings[],
  currentTimeUtc: Date
): NotificationSettings[] {
  return settings.filter((setting) => {
    // タイムゾーンを考慮して現在時刻を取得
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: setting.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(currentTimeUtc);

    const hourPart = parts.find((p) => p.type === 'hour');
    const minutePart = parts.find((p) => p.type === 'minute');

    if (!hourPart || !minutePart) {
      return false;
    }

    const currentTimeStr = `${hourPart.value.padStart(2, '0')}:${minutePart.value.padStart(2, '0')}`;

    // reminders配列をチェック（新形式）
    const hasMatchingReminder = setting.reminders?.some(
      (reminder: Reminder) => reminder.enabled && reminder.time === currentTimeStr
    );

    // 後方互換性: remindersがない場合はmain_reminder_timeを使用
    // main_reminder_timeは "HH:MM:SS" 形式なので、秒を除いて比較
    const mainTimeWithoutSeconds = setting.main_reminder_time?.slice(0, 5);
    const matchesMainTime = !setting.reminders?.length && currentTimeStr === mainTimeWithoutSeconds;

    if (!hasMatchingReminder && !matchesMainTime) {
      return false;
    }

    // activeDaysが指定されている場合は曜日チェック
    if (setting.active_days && setting.active_days.length > 0) {
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: setting.timezone,
        weekday: 'short',
      });
      const weekdayStr = dayFormatter.format(currentTimeUtc);
      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

      if (!setting.active_days.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * タイムゾーンを考慮してその日の開始・終了時刻を取得する
 */
function getDayBoundaries(
  timezone: string,
  currentTimeUtc: Date
): { startOfDay: Date; endOfDay: Date } {
  // タイムゾーンを考慮した日付を取得
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(currentTimeUtc);

  // オフセットを取得
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, currentTimeUtc);

  // その日の開始時刻（ローカル00:00）をUTCに変換
  const startOfDayLocal = new Date(`${dateStr}T00:00:00`);
  const startOfDay = new Date(startOfDayLocal.getTime() - offsetMinutes * 60 * 1000);

  // その日の終了時刻（ローカル23:59:59.999）をUTCに変換
  const endOfDayLocal = new Date(`${dateStr}T23:59:59.999`);
  const endOfDay = new Date(endOfDayLocal.getTime() - offsetMinutes * 60 * 1000);

  return { startOfDay, endOfDay };
}

/**
 * タイムゾーンのオフセットを分単位で取得する
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  const offsetParts = offsetFormatter.formatToParts(date);
  const offsetPart = offsetParts.find((p) => p.type === 'timeZoneName');
  const offsetStr = offsetPart?.value || 'GMT+0';

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
 * 同一分内の重複送信をチェック
 */
async function checkDuplicateInDatabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  type: string,
  currentTimeUtc: Date
): Promise<boolean> {
  // 現在分の開始・終了時刻
  const startOfMinute = new Date(currentTimeUtc);
  startOfMinute.setSeconds(0, 0);

  const endOfMinute = new Date(startOfMinute);
  endOfMinute.setMinutes(endOfMinute.getMinutes() + 1);

  const { data: logs } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('sent_at', startOfMinute.toISOString())
    .lt('sent_at', endOfMinute.toISOString())
    .limit(1);

  return logs && logs.length > 0;
}

/**
 * 当日のエントリー存在チェック
 */
async function checkTodayEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  timezone: string,
  currentTimeUtc: Date
): Promise<boolean> {
  const { startOfDay, endOfDay } = getDayBoundaries(timezone, currentTimeUtc);

  const { data: entries } = await supabase
    .from('entries')
    .select('id')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .limit(1);

  return entries && entries.length > 0;
}

/**
 * 通知ログを記録
 */
async function logNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  type: string,
  result: string,
  errorMessage?: string
): Promise<void> {
  await supabase.from('notification_logs').insert({
    user_id: userId,
    type,
    result,
    error_message: errorMessage || null,
  });
}

/**
 * 通知を送信
 */
async function sendNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  subscriptions: PushSubscription[],
  payload: object
): Promise<{ success: boolean; error?: string }> {
  let hasSuccess = false;

  for (const subscription of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      hasSuccess = true;
    } catch (error) {
      const webPushError = error as { statusCode?: number };

      // 410 Gone: 購読が無効なので削除
      if (webPushError.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', subscription.id);
        console.log(`Removed invalid subscription: ${subscription.id}`);
      } else {
        console.error(`Failed to send notification to ${subscription.id}:`, error);
      }
    }
  }

  return {
    success: hasSuccess,
    error: hasSuccess ? undefined : 'All subscriptions failed',
  };
}

/**
 * メインリマインドの通知ペイロードを生成
 */
function getMainReminderPayload(): object {
  const messages = [
    { title: 'ヒビオル', body: '今日はどんな一日だった？' },
    { title: 'ヒビオル', body: '一言だけでも残しておこう' },
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    ...message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: '/',
      type: 'main_reminder',
      notificationId: crypto.randomUUID(),
    },
  };
}

/**
 * 追いリマインドの通知ペイロードを生成
 */
function getChaseReminderPayload(count: number): object {
  let messages;

  if (count <= 1) {
    messages = [
      { title: 'ヒビオル', body: 'まだ間に合うよ' },
      { title: 'ヒビオル', body: '30秒で終わる' },
    ];
  } else {
    messages = [
      { title: 'ヒビオル', body: '今日の最後のチャンス' },
      { title: 'ヒビオル', body: 'ほつれ使う？' },
    ];
  }

  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    ...message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: '/',
      type: 'chase_reminder',
      notificationId: crypto.randomUUID(),
    },
  };
}
