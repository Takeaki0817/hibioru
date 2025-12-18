/**
 * Service Worker ハンドラーモジュール
 *
 * Service Workerの通知処理ロジックをテスト可能な形で分離したモジュールです。
 * public/sw.js から呼び出されることを想定していますが、
 * ブラウザAPIに依存しない純粋なロジック部分を提供します。
 *
 * Requirements: 5.5
 * - プッシュ通知受信時の処理（pushイベント）
 * - 通知クリック時のアプリ画面遷移（notificationclickイベント）
 */

/**
 * 通知タイプ
 * - main: メインリマインド
 * - follow_up_1: 追いリマインド1回目
 * - follow_up_2: 追いリマインド2回目
 */
export type NotificationType = 'main' | 'follow_up_1' | 'follow_up_2';

/**
 * 通知ペイロード（サーバーから送信されるデータ）
 */
export interface NotificationPayload {
  /** 通知タイトル */
  title: string;
  /** 通知本文 */
  body: string;
  /** アイコンのパス */
  icon?: string;
  /** バッジのパス */
  badge?: string;
  /** 通知データ */
  data?: {
    /** クリック時に開くURL */
    url?: string;
    /** 通知タイプ */
    type?: NotificationType;
    /** 通知ID */
    notificationId?: string;
  };
}

/**
 * 通知オプション（Service Worker showNotification用）
 */
export interface NotificationOptions {
  /** 通知本文 */
  body: string;
  /** アイコンのパス */
  icon: string;
  /** バッジのパス */
  badge: string;
  /** 通知タグ（同一タグの通知は上書き） */
  tag: string;
  /** ユーザー操作が必要かどうか */
  requireInteraction: boolean;
  /** バイブレーションパターン */
  vibrate: number[];
  /** 通知に紐づくデータ */
  data: {
    /** クリック時に開くURL */
    url: string;
    /** 通知タイプ */
    type?: NotificationType;
    /** 通知ID */
    notificationId?: string;
    /** 受信タイムスタンプ */
    timestamp: number;
  };
}

/**
 * handlePushの戻り値
 */
export interface PushHandleResult {
  /** 通知タイトル */
  title: string;
  /** 通知オプション */
  options: NotificationOptions;
}

/**
 * handleNotificationClickの戻り値
 */
export interface NotificationClickResult {
  /** 実行したアクション */
  action: 'focus' | 'open';
  /** 対象URL */
  targetUrl: string;
}

/**
 * Clientsインターフェース（モック用）
 */
export interface ClientsInterface {
  matchAll: (options?: { type?: string; includeUncontrolled?: boolean }) => Promise<ClientInterface[]>;
  openWindow: (url: string) => Promise<unknown>;
}

/**
 * Clientインターフェース（モック用）
 */
export interface ClientInterface {
  url: string;
  focus?: () => Promise<unknown>;
}

/**
 * デフォルト通知オプション
 */
export const DEFAULT_NOTIFICATION_OPTIONS = {
  /** デフォルトタイトル */
  title: 'ヒビオル',
  /** デフォルト本文 */
  body: '今日の記録を残しましょう',
  /** デフォルトアイコン */
  icon: '/icon-192.png',
  /** デフォルトバッジ */
  badge: '/badge-72.png',
  /** デフォルトURL */
  url: '/',
} as const;

/**
 * 通知ペイロードをパースする
 *
 * サーバーから送信された通知データを解析し、
 * 欠損している値にはデフォルト値を補完します。
 *
 * @param data - パース対象のデータ（JSONパース済み）
 * @returns パース済みの通知ペイロード
 */
export function parseNotificationPayload(data: unknown): NotificationPayload {
  // nullish または非オブジェクトの場合はデフォルト値を返す
  if (data === null || data === undefined || typeof data !== 'object') {
    return {
      title: DEFAULT_NOTIFICATION_OPTIONS.title,
      body: DEFAULT_NOTIFICATION_OPTIONS.body,
      icon: DEFAULT_NOTIFICATION_OPTIONS.icon,
      badge: DEFAULT_NOTIFICATION_OPTIONS.badge,
      data: {
        url: DEFAULT_NOTIFICATION_OPTIONS.url,
      },
    };
  }

  const payload = data as Record<string, unknown>;

  // 各フィールドを取得し、デフォルト値で補完
  const title = typeof payload.title === 'string' && payload.title
    ? payload.title
    : DEFAULT_NOTIFICATION_OPTIONS.title;

  const body = typeof payload.body === 'string' && payload.body
    ? payload.body
    : DEFAULT_NOTIFICATION_OPTIONS.body;

  const icon = typeof payload.icon === 'string' && payload.icon
    ? payload.icon
    : DEFAULT_NOTIFICATION_OPTIONS.icon;

  const badge = typeof payload.badge === 'string' && payload.badge
    ? payload.badge
    : DEFAULT_NOTIFICATION_OPTIONS.badge;

  // data オブジェクトの処理
  let notificationData: NotificationPayload['data'] = {
    url: DEFAULT_NOTIFICATION_OPTIONS.url,
  };

  if (payload.data && typeof payload.data === 'object') {
    const rawData = payload.data as Record<string, unknown>;
    notificationData = {
      url: typeof rawData.url === 'string' && rawData.url
        ? rawData.url
        : DEFAULT_NOTIFICATION_OPTIONS.url,
      type: rawData.type as NotificationType | undefined,
      notificationId: typeof rawData.notificationId === 'string'
        ? rawData.notificationId
        : undefined,
    };
  }

  return {
    title,
    body,
    icon,
    badge,
    data: notificationData,
  };
}

/**
 * 通知オプションを生成する
 *
 * パース済みのペイロードから、Service Workerの
 * showNotificationメソッドに渡すオプションを生成します。
 *
 * @param payload - パース済みの通知ペイロード
 * @returns 通知オプション
 */
export function createNotificationOptions(payload: NotificationPayload): NotificationOptions {
  return {
    body: payload.body,
    icon: payload.icon || DEFAULT_NOTIFICATION_OPTIONS.icon,
    badge: payload.badge || DEFAULT_NOTIFICATION_OPTIONS.badge,
    tag: 'hibioru-notification', // 同じタグの通知は上書きされる
    requireInteraction: false, // 自動で消える
    vibrate: [200, 100, 200], // バイブレーションパターン
    data: {
      url: payload.data?.url || DEFAULT_NOTIFICATION_OPTIONS.url,
      type: payload.data?.type,
      notificationId: payload.data?.notificationId,
      timestamp: Date.now(),
    },
  };
}

/**
 * プッシュ通知受信時のハンドラ
 *
 * PushEventから通知データを取得し、表示用のタイトルとオプションを返します。
 *
 * @param pushData - プッシュイベントのデータ（JSONパース済み）
 * @returns 通知タイトルとオプション
 */
export function handlePush(pushData: unknown): PushHandleResult {
  const payload = parseNotificationPayload(pushData);
  const options = createNotificationOptions(payload);

  return {
    title: payload.title,
    options,
  };
}

/**
 * 通知クリック時のハンドラ
 *
 * 通知クリック時に適切なウィンドウを開くかフォーカスします。
 * - 同一URLのウィンドウがあればフォーカス
 * - なければ新規ウィンドウを開く
 *
 * @param notificationData - 通知に紐づくデータ
 * @param clients - Service Worker Clients API
 * @returns 実行結果
 */
export async function handleNotificationClick(
  notificationData: { url?: string; type?: string } | null,
  clients: ClientsInterface
): Promise<NotificationClickResult> {
  // 遷移先URLを決定
  const targetUrl = notificationData?.url || DEFAULT_NOTIFICATION_OPTIONS.url;

  // 開いているウィンドウを取得
  const clientList = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // 同一URLのウィンドウがあればフォーカス
  for (const client of clientList) {
    if (client.url === targetUrl && client.focus) {
      await client.focus();
      return {
        action: 'focus',
        targetUrl,
      };
    }
  }

  // 該当するウィンドウがなければ新規ウィンドウを開く
  await clients.openWindow(targetUrl);
  return {
    action: 'open',
    targetUrl,
  };
}
