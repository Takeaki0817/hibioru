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
 *
 * @note このファイルは静的ファイルのため、以下の定数と手動で同期が必要:
 * @see src/lib/constants/app-config.ts - アプリ設定定数
 * @see src/features/notification/sw-handlers.ts - DEFAULT_NOTIFICATION_OPTIONS
 */

// Service Workerのバージョン（キャッシュ管理用）
// @sync src/lib/constants/app-config.ts SW_CONFIG.cacheVersion
const CACHE_VERSION = 'v1';
// @sync src/lib/constants/app-config.ts SW_CONFIG.cacheName
const CACHE_NAME = `hibioru-${CACHE_VERSION}`;

// キャッシュ対象の静的アセット
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// キャッシュ対象外のパターン
const CACHE_EXCLUDE_PATTERNS = [
  /^\/api\//,           // APIリクエスト
  /^\/docs\//,          // ドキュメントページ（PWA対象外）
  /supabase/,           // Supabaseリクエスト
  /\/_next\/webpack/,   // Webpack HMR
  /\/sw\.js$/,          // Service Worker自体
];

/**
 * デフォルト通知オプション
 * @sync src/lib/constants/app-config.ts NOTIFICATION_CONFIG
 * @sync src/features/notification/sw-handlers.ts DEFAULT_NOTIFICATION_OPTIONS
 */
const DEFAULT_NOTIFICATION_OPTIONS = {
  // @sync NOTIFICATION_CONFIG.defaultTitle
  title: 'ヒビオル',
  // @sync NOTIFICATION_CONFIG.defaultBody
  body: '今考えてること、記録しよう！',
  // アイコンは存在する場合のみ設定（存在しない場合はブラウザデフォルト）
  icon: null,
  badge: null,
  // @sync NOTIFICATION_CONFIG.defaultUrl
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
 * URLがキャッシュ対象外かどうかを判定
 * @param {string} url - チェックするURL
 * @returns {boolean} キャッシュ対象外ならtrue
 */
function shouldExcludeFromCache(url) {
  return CACHE_EXCLUDE_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Service Workerインストール時の処理
 * 静的アセットをプリキャッシュ
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] インストール中');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 静的アセットをプリキャッシュ中');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[Service Worker] 一部のアセットのプリキャッシュに失敗:', error);
        // プリキャッシュの失敗は致命的ではないため、インストールは続行
      });
    }).then(() => {
      // 即座にアクティベート
      self.skipWaiting();
    })
  );
});

/**
 * Service Workerアクティベーション時の処理
 * 古いキャッシュを削除
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] アクティベート中');
  event.waitUntil(
    Promise.all([
      // 古いキャッシュを削除
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[Service Worker] 古いキャッシュを削除:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // 古いService Workerを即座に置き換え
      clients.claim(),
    ]).then(() => {
      console.log('[Service Worker] アクティベート完了');
    })
  );
});

/**
 * フェッチイベントの処理
 * キャッシュ戦略: Network First with Cache Fallback
 * - ネットワークから取得を試み、成功したらキャッシュに保存
 * - ネットワーク失敗時はキャッシュから返却
 * - 両方失敗時はオフラインページを表示
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 同一オリジン以外、またはキャッシュ対象外はスキップ
  if (url.origin !== self.location.origin || shouldExcludeFromCache(url.pathname)) {
    return;
  }

  // GETリクエストのみキャッシュ
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 正常なレスポンスのみキャッシュ
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // ネットワークエラー時はキャッシュから返却
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // HTMLリクエストでキャッシュもない場合はオフラインページ
        if (request.headers.get('accept')?.includes('text/html')) {
          const offlinePage = await caches.match('/offline');
          if (offlinePage) {
            return offlinePage;
          }
        }

        // それ以外は503エラー
        return new Response('オフラインです', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
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

/**
 * メッセージイベントの処理
 * クライアントからのメッセージを受信し、対応するアクションを実行
 */
self.addEventListener('message', (event) => {
  console.log('[Service Worker] メッセージを受信:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[Service Worker] skipWaiting() を実行');
    self.skipWaiting();
  }
});
