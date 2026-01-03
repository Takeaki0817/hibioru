/**
 * Web Push 通知の共通型定義
 *
 * プッシュ通知送信に関する共通の型を定義します。
 * notification feature と social feature の両方から使用されます。
 */

/**
 * 通知ペイロード
 */
export interface PushNotificationPayload {
  /** 通知タイトル */
  title: string
  /** 通知本文 */
  body: string
  /** アイコンURL */
  icon?: string
  /** バッジURL */
  badge?: string
  /** 追加データ */
  data?: {
    /** クリック時の遷移先URL */
    url: string
    /** 通知種別 */
    type: PushNotificationType
    /** 通知ID */
    notificationId: string
    /** タイムスタンプ（ソーシャル通知用） */
    timestamp?: number
  }
}

/**
 * プッシュ通知種別
 */
export type PushNotificationType =
  | 'main_reminder'
  | 'chase_reminder'
  | 'main'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'celebration'
  | 'follow'

/**
 * 送信結果
 */
export interface SendResult {
  /** 購読ID */
  subscriptionId: string
  /** 送信成功フラグ */
  success: boolean
  /** HTTPステータスコード */
  statusCode?: number
  /** エラーメッセージ */
  error?: string
  /** 購読を削除すべきか（410 Gone等） */
  shouldRemove?: boolean
}

/**
 * 配信エラーの型
 */
export type DispatchError =
  | { type: 'NO_SUBSCRIPTIONS' }
  | { type: 'ALL_FAILED'; results: SendResult[] }
  | { type: 'VAPID_ERROR'; message: string }

/**
 * 購読情報（送信用の最小インターフェース）
 */
export interface PushSubscriptionInfo {
  id: string
  endpoint: string
  p256dhKey: string
  authKey: string
}
