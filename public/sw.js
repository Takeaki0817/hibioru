/**
 * Service Worker - プッシュ通知処理
 *
 * このファイルはブラウザのService Workerとして実行されます。
 * プッシュ通知の受信と表示、クリック時の処理を行います。
 *
 * Requirements: 5.5
 * - pushイベントで通知内容を解析して表示
 * - アプリアイコンとバッジの設定
 * - 通知データ（URL、タイプ）の受け渡し
 * - クリック時にアプリ画面（記録入力画面）を開く
 * - 既存ウィンドウがあればフォーカス
 * - 新規ウィンドウを開く場合のURL指定
 */

// Service Workerのバージョン（キャッシュ管理用）
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 将来のキャッシュ機能拡張用
const CACHE_VERSION = 'v1';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 将来のキャッシュ機能拡張用
const CACHE_NAME = `hibioru-${CACHE_VERSION}`;

/**
 * デフォルト通知オプション
 * lib/notification/sw-handlers.ts の DEFAULT_NOTIFICATION_OPTIONS と同期
 */
const DEFAULT_NOTIFICATION_OPTIONS = {
  title: 'ヒビオル',
  body: '今日の記録を残しましょう',
  // アイコンは存在する場合のみ設定（存在しない場合はブラウザデフォルト）
  icon: null,
  badge: null,
  url: '/',
};

/**
 * 通知ペイロードをパースする
 *
 * サーバーから送信された通知データを解析し、
 * 欠損している値にはデフォルト値を補完します。
 *
 * @param {unknown} data - パース対象のデータ（JSONパース済み）
 * @returns {Object} パース済みの通知データ
 */
function parseNotificationPayload(data) {
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

  // 各フィールドを取得し、デフォルト値で補完
  const title = typeof data.title === 'string' && data.title
    ? data.title
    : DEFAULT_NOTIFICATION_OPTIONS.title;

  const body = typeof data.body === 'string' && data.body
    ? data.body
    : DEFAULT_NOTIFICATION_OPTIONS.body;

  const icon = typeof data.icon === 'string' && data.icon
    ? data.icon
    : DEFAULT_NOTIFICATION_OPTIONS.icon;

  const badge = typeof data.badge === 'string' && data.badge
    ? data.badge
    : DEFAULT_NOTIFICATION_OPTIONS.badge;

  // data オブジェクトの処理
  let notificationData = {
    url: DEFAULT_NOTIFICATION_OPTIONS.url,
  };

  if (data.data && typeof data.data === 'object') {
    notificationData = {
      url: typeof data.data.url === 'string' && data.data.url
        ? data.data.url
        : DEFAULT_NOTIFICATION_OPTIONS.url,
      type: data.data.type, // 'main' | 'follow_up_1' | 'follow_up_2'
      notificationId: typeof data.data.notificationId === 'string'
        ? data.data.notificationId
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
 * @param {Object} payload - パース済みの通知ペイロード
 * @returns {Object} 通知オプション
 */
function createNotificationOptions(payload) {
  const options = {
    body: payload.body,
    tag: 'hibioru-notification', // 同じタグの通知は上書きされる
    requireInteraction: false, // 自動で消える
    vibrate: [200, 100, 200], // バイブレーションパターン
    data: {
      url: payload.data?.url || DEFAULT_NOTIFICATION_OPTIONS.url,
      type: payload.data?.type, // 通知タイプ（main, follow_up_1, follow_up_2）
      notificationId: payload.data?.notificationId, // 通知追跡ID
      timestamp: Date.now(),
    },
  };

  // アイコンは存在する場合のみ設定
  const icon = payload.icon || DEFAULT_NOTIFICATION_OPTIONS.icon;
  const badge = payload.badge || DEFAULT_NOTIFICATION_OPTIONS.badge;
  if (icon) options.icon = icon;
  if (badge) options.badge = badge;

  return options;
}

/**
 * プッシュ通知受信時の処理
 *
 * Requirements: 5.5
 * - pushイベントで通知内容を解析して表示
 * - アプリアイコンとバッジの設定
 * - 通知データ（URL、タイプ）の受け渡し
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] プッシュ通知を受信しました', event);

  let pushData = null;

  if (event.data) {
    try {
      pushData = event.data.json();
      console.log('[Service Worker] 通知データ:', pushData);
    } catch (error) {
      console.error('[Service Worker] 通知データのパースに失敗しました', error);
    }
  }

  // ペイロードをパースして通知オプションを生成
  const payload = parseNotificationPayload(pushData);
  const options = createNotificationOptions(payload);

  console.log('[Service Worker] 通知タイトル:', payload.title);
  console.log('[Service Worker] 通知オプション:', options);

  // 通知を表示
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
      .then(() => {
        console.log('[Service Worker] 通知表示成功');
      })
      .catch((error) => {
        console.error('[Service Worker] 通知表示エラー:', error);
      })
  );
});

/**
 * 通知クリック時の処理
 *
 * Requirements: 5.5
 * - クリック時にアプリ画面（記録入力画面）を開く
 * - 既存ウィンドウがあればフォーカス
 * - 新規ウィンドウを開く場合のURL指定
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知がクリックされました', event);

  // 通知を閉じる
  event.notification.close();

  // 遷移先URLを決定
  const notificationData = event.notification.data;
  const targetUrl = notificationData?.url || DEFAULT_NOTIFICATION_OPTIONS.url;

  // アプリを開く処理
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 同一URLのウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          console.log('[Service Worker] 既存ウィンドウにフォーカス:', targetUrl);
          return client.focus();
        }
      }
      // 開いているタブがなければ新しいタブを開く
      if (clients.openWindow) {
        console.log('[Service Worker] 新規ウィンドウを開く:', targetUrl);
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Service Workerインストール時の処理
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] インストール中', event);
  // 即座にアクティベート
  self.skipWaiting();
});

/**
 * Service Workerアクティベーション時の処理
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] アクティベート中', event);
  // 古いService Workerを即座に置き換え
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[Service Worker] アクティベート完了');
    })
  );
});

/**
 * バックグラウンド同期（将来の拡張用）
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] バックグラウンド同期', event);
  if (event.tag === 'sync-entries') {
    event.waitUntil(
      // 将来的にオフライン時の記録を同期する処理を実装
      Promise.resolve()
    );
  }
});
