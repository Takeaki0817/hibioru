/**
 * 通知機能の型定義
 */

/**
 * プッシュ通知購読情報
 */
export interface PushSubscriptionData {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at?: string;
}

/**
 * Web Push API の購読オブジェクト（JSON変換後）
 */
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * 通知設定
 */
export interface NotificationSettings {
  user_id: string;
  /** 通知の有効/無効 */
  enabled: boolean;
  /** メインリマインド時刻（HH:MM形式） */
  main_reminder_time: string;
  /** 追いリマインドの有効/無効 */
  chase_reminder_enabled: boolean;
  /** 追いリマインド遅延時間（分） */
  chase_reminder_delay_minutes: number;
}

/**
 * 通知設定のデフォルト値
 */
export const DEFAULT_NOTIFICATION_SETTINGS: Omit<NotificationSettings, 'user_id'> = {
  enabled: true,
  main_reminder_time: '21:00',
  chase_reminder_enabled: true,
  chase_reminder_delay_minutes: 60,
};

/**
 * 通知種別
 */
export type NotificationType = 'main_reminder' | 'chase_reminder';

/**
 * 通知送信結果
 */
export type NotificationResult = 'success' | 'failed' | 'skipped';

/**
 * 通知ログ
 */
export interface NotificationLog {
  id?: string;
  user_id: string;
  type: NotificationType;
  sent_at: string;
  result: NotificationResult;
  entry_recorded_at?: string;
  error_message?: string;
  created_at?: string;
}

/**
 * プッシュ通知のペイロード
 */
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

/**
 * 定時リマインド通知のペイロード
 */
export const MAIN_REMINDER_PAYLOAD: NotificationPayload = {
  title: 'ヒビオル',
  body: '今日の記録を残しましょう',
  icon: '/icon-192.png',
  badge: '/badge-72.png',
  url: '/',
};

/**
 * 追いリマインド通知のペイロード
 */
export const CHASE_REMINDER_PAYLOAD: NotificationPayload = {
  title: 'ヒビオル',
  body: 'まだ記録が残っていません。継続を途切れさせないために、今すぐ記録しましょう！',
  icon: '/icon-192.png',
  badge: '/badge-72.png',
  url: '/',
};

/**
 * Service Worker登録状態
 */
export interface ServiceWorkerStatus {
  /** Service Workerがサポートされているか */
  supported: boolean;
  /** Service Workerが登録されているか */
  registered: boolean;
  /** プッシュ通知が許可されているか */
  permission: NotificationPermission;
}

/**
 * 通知権限リクエストの結果
 */
export interface NotificationPermissionResult {
  /** 権限が許可されたか */
  granted: boolean;
  /** 権限の状態 */
  permission: NotificationPermission;
  /** エラーメッセージ（権限拒否時） */
  error?: string;
}
