/**
 * Service Worker - プッシュ通知処理
 *
 * このファイルはブラウザのService Workerとして実行されます。
 * プッシュ通知の受信と表示、クリック時の処理を行います。
 */

// Service Workerのバージョン（キャッシュ管理用）
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 将来のキャッシュ機能拡張用
const CACHE_VERSION = 'v1';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 将来のキャッシュ機能拡張用
const CACHE_NAME = `hibioru-${CACHE_VERSION}`;

/**
 * プッシュ通知受信時の処理
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] プッシュ通知を受信しました', event);

  // デフォルト値
  const defaultTitle = 'ヒビオル';
  const defaultBody = '今日の記録を残しましょう';
  const defaultIcon = '/icon-192.png';
  const defaultBadge = '/badge-72.png';
  const defaultUrl = '/';

  // 通知データの取得
  let notificationData = {
    title: defaultTitle,
    body: defaultBody,
    icon: defaultIcon,
    badge: defaultBadge,
    url: defaultUrl,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || defaultTitle,
        body: data.body || defaultBody,
        icon: data.icon || defaultIcon,
        badge: data.badge || defaultBadge,
        url: data.url || defaultUrl,
      };
    } catch (error) {
      console.error('[Service Worker] 通知データのパースに失敗しました', error);
    }
  }

  // 通知オプション
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: 'hibioru-notification', // 同じタグの通知は上書きされる
    requireInteraction: false, // 自動で消える
    vibrate: [200, 100, 200], // バイブレーションパターン
    data: {
      url: notificationData.url,
      timestamp: Date.now(),
    },
  };

  // 通知を表示
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

/**
 * 通知クリック時の処理
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知がクリックされました', event);

  // 通知を閉じる
  event.notification.close();

  // 遷移先URL
  const urlToOpen = event.notification.data?.url || '/';

  // アプリを開く処理
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているタブがあれば、そのタブをフォーカス
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 開いているタブがなければ新しいタブを開く
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
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
