/**
 * Service Worker (sw.js) のテスト
 *
 * Requirements: 5.5
 * - プッシュ通知受信時の処理（pushイベント）
 * - 通知クリック時のアプリ画面遷移（notificationclickイベント）
 *
 * Service WorkerはブラウザAPIを使用するため、モックを使った単体テストを実装
 */

import {
  handlePush,
  handleNotificationClick,
  createNotificationOptions,
  parseNotificationPayload,
  type NotificationPayload,
  DEFAULT_NOTIFICATION_OPTIONS,
} from '@/features/notification/sw-handlers';

describe('Service Worker - プッシュ通知受信ハンドラ', () => {
  describe('parseNotificationPayload', () => {
    describe('有効なペイロード', () => {
      it('完全なペイロードを正しくパースする', () => {
        const data = {
          title: 'テストタイトル',
          body: 'テスト本文',
          icon: '/custom-icon.png',
          badge: '/custom-badge.png',
          data: {
            url: '/new',
            type: 'main',
            notificationId: 'notif-123',
          },
        };

        const result = parseNotificationPayload(data);

        expect(result.title).toBe('テストタイトル');
        expect(result.body).toBe('テスト本文');
        expect(result.icon).toBe('/custom-icon.png');
        expect(result.badge).toBe('/custom-badge.png');
        expect(result.data?.url).toBe('/new');
        expect(result.data?.type).toBe('main');
        expect(result.data?.notificationId).toBe('notif-123');
      });

      it('部分的なペイロードでデフォルト値を補完する', () => {
        const data = {
          title: 'カスタムタイトル',
          body: 'カスタム本文',
        };

        const result = parseNotificationPayload(data);

        expect(result.title).toBe('カスタムタイトル');
        expect(result.body).toBe('カスタム本文');
        expect(result.icon).toBe(DEFAULT_NOTIFICATION_OPTIONS.icon);
        expect(result.badge).toBe(DEFAULT_NOTIFICATION_OPTIONS.badge);
        expect(result.data?.url).toBe(DEFAULT_NOTIFICATION_OPTIONS.url);
      });

      it('通知タイプ「main」を正しく処理する', () => {
        const data = {
          title: 'ヒビオル',
          body: '今日はどんな一日だった？',
          data: { type: 'main' },
        };

        const result = parseNotificationPayload(data);
        expect(result.data?.type).toBe('main');
      });

      it('通知タイプ「follow_up_1」を正しく処理する', () => {
        const data = {
          title: 'ヒビオル',
          body: 'まだ間に合うよ',
          data: { type: 'follow_up_1' },
        };

        const result = parseNotificationPayload(data);
        expect(result.data?.type).toBe('follow_up_1');
      });

      it('通知タイプ「follow_up_2」を正しく処理する', () => {
        const data = {
          title: 'ヒビオル',
          body: '今日の最後のチャンス',
          data: { type: 'follow_up_2' },
        };

        const result = parseNotificationPayload(data);
        expect(result.data?.type).toBe('follow_up_2');
      });
    });

    describe('無効または欠損データ', () => {
      it('nullの場合はデフォルト値を返す', () => {
        const result = parseNotificationPayload(null);

        expect(result.title).toBe(DEFAULT_NOTIFICATION_OPTIONS.title);
        expect(result.body).toBe(DEFAULT_NOTIFICATION_OPTIONS.body);
        expect(result.icon).toBe(DEFAULT_NOTIFICATION_OPTIONS.icon);
        expect(result.badge).toBe(DEFAULT_NOTIFICATION_OPTIONS.badge);
        expect(result.data?.url).toBe(DEFAULT_NOTIFICATION_OPTIONS.url);
      });

      it('undefinedの場合はデフォルト値を返す', () => {
        const result = parseNotificationPayload(undefined);

        expect(result.title).toBe(DEFAULT_NOTIFICATION_OPTIONS.title);
        expect(result.body).toBe(DEFAULT_NOTIFICATION_OPTIONS.body);
      });

      it('空オブジェクトの場合はデフォルト値を返す', () => {
        const result = parseNotificationPayload({});

        expect(result.title).toBe(DEFAULT_NOTIFICATION_OPTIONS.title);
        expect(result.body).toBe(DEFAULT_NOTIFICATION_OPTIONS.body);
      });

      it('不正なJSON文字列の場合はエラーをスローしない', () => {
        // parseNotificationPayloadはJSONパース済みのオブジェクトを受け取る想定
        // 不正な型が渡された場合はデフォルト値を返す
        const result = parseNotificationPayload('invalid' as unknown);
        expect(result.title).toBe(DEFAULT_NOTIFICATION_OPTIONS.title);
      });
    });
  });

  describe('createNotificationOptions', () => {
    it('ペイロードから通知オプションを生成する', () => {
      const payload: NotificationPayload = {
        title: 'ヒビオル',
        body: '今日はどんな一日だった？',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: {
          url: '/new',
          type: 'main',
          notificationId: 'test-123',
        },
      };

      const options = createNotificationOptions(payload);

      expect(options.body).toBe('今日はどんな一日だった？');
      expect(options.icon).toBe('/icon-192.png');
      expect(options.badge).toBe('/badge-72.png');
      expect(options.tag).toBe('hibioru-notification');
      expect(options.data.url).toBe('/new');
      expect(options.data.type).toBe('main');
      expect(options.data.notificationId).toBe('test-123');
    });

    it('タグが設定されている（同一タグの通知は上書き）', () => {
      const payload: NotificationPayload = {
        title: 'ヒビオル',
        body: 'テスト',
      };

      const options = createNotificationOptions(payload);
      expect(options.tag).toBe('hibioru-notification');
    });

    it('バイブレーションパターンが設定されている', () => {
      const payload: NotificationPayload = {
        title: 'ヒビオル',
        body: 'テスト',
      };

      const options = createNotificationOptions(payload);
      expect(options.vibrate).toEqual([200, 100, 200]);
    });

    it('requireInteractionがfalse（自動で消える）', () => {
      const payload: NotificationPayload = {
        title: 'ヒビオル',
        body: 'テスト',
      };

      const options = createNotificationOptions(payload);
      expect(options.requireInteraction).toBe(false);
    });

    it('dataにtimestampが含まれる', () => {
      const payload: NotificationPayload = {
        title: 'ヒビオル',
        body: 'テスト',
      };

      const beforeTime = Date.now();
      const options = createNotificationOptions(payload);
      const afterTime = Date.now();

      expect(options.data.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(options.data.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('DEFAULT_NOTIFICATION_OPTIONS', () => {
    it('デフォルトタイトルは「ヒビオル」', () => {
      expect(DEFAULT_NOTIFICATION_OPTIONS.title).toBe('ヒビオル');
    });

    it('デフォルト本文が設定されている', () => {
      expect(DEFAULT_NOTIFICATION_OPTIONS.body).toBe('今日の記録を残しましょう');
    });

    it('デフォルトアイコンパスが設定されている', () => {
      expect(DEFAULT_NOTIFICATION_OPTIONS.icon).toBe('/icon-192x192.png');
    });

    it('デフォルトバッジパスが設定されている', () => {
      expect(DEFAULT_NOTIFICATION_OPTIONS.badge).toBe('/badge-72.png');
    });

    it('デフォルトURLがルートパス', () => {
      expect(DEFAULT_NOTIFICATION_OPTIONS.url).toBe('/');
    });
  });
});

describe('Service Worker - 通知クリックハンドラ', () => {
  describe('handleNotificationClick', () => {
    // モック用のClientオブジェクト
    const createMockClient = (url: string, canFocus = true) => ({
      url,
      focus: canFocus ? jest.fn().mockResolvedValue(undefined) : undefined,
    });

    // モック用のclientsオブジェクト
    const createMockClients = (clientList: ReturnType<typeof createMockClient>[]) => ({
      matchAll: jest.fn().mockResolvedValue(clientList),
      openWindow: jest.fn().mockResolvedValue(undefined),
    });

    it('通知データからURLを取得して使用する', async () => {
      const notificationData = { url: '/new', type: 'main' };
      const mockClients = createMockClients([]);

      const result = await handleNotificationClick(notificationData, mockClients);

      expect(result.targetUrl).toBe('/new');
    });

    it('通知データにURLがない場合はルートパスを使用する', async () => {
      const notificationData = { type: 'main' };
      const mockClients = createMockClients([]);

      const result = await handleNotificationClick(notificationData, mockClients);

      expect(result.targetUrl).toBe('/');
    });

    it('notificationDataがnullの場合はルートパスを使用する', async () => {
      const mockClients = createMockClients([]);

      const result = await handleNotificationClick(null, mockClients);

      expect(result.targetUrl).toBe('/');
    });

    it('同一URLのウィンドウがあればフォーカスする', async () => {
      const targetUrl = '/new';
      const existingClient = createMockClient(targetUrl);
      const mockClients = createMockClients([existingClient]);

      const result = await handleNotificationClick({ url: targetUrl }, mockClients);

      expect(result.action).toBe('focus');
      expect(existingClient.focus).toHaveBeenCalled();
      expect(mockClients.openWindow).not.toHaveBeenCalled();
    });

    it('同一URLのウィンドウがなければ新規ウィンドウを開く', async () => {
      const targetUrl = '/new';
      const otherClient = createMockClient('/other');
      const mockClients = createMockClients([otherClient]);

      const result = await handleNotificationClick({ url: targetUrl }, mockClients);

      expect(result.action).toBe('open');
      expect(mockClients.openWindow).toHaveBeenCalledWith(targetUrl);
    });

    it('ウィンドウが1つも開いていなければ新規ウィンドウを開く', async () => {
      const targetUrl = '/new';
      const mockClients = createMockClients([]);

      const result = await handleNotificationClick({ url: targetUrl }, mockClients);

      expect(result.action).toBe('open');
      expect(mockClients.openWindow).toHaveBeenCalledWith(targetUrl);
    });

    it('複数ウィンドウがある場合、完全一致するURLのウィンドウをフォーカスする', async () => {
      const targetUrl = '/new';
      const client1 = createMockClient('/');
      const client2 = createMockClient('/new');
      const client3 = createMockClient('/social');
      const mockClients = createMockClients([client1, client2, client3]);

      const result = await handleNotificationClick({ url: targetUrl }, mockClients);

      expect(result.action).toBe('focus');
      expect(client2.focus).toHaveBeenCalled();
      expect(client1.focus).not.toHaveBeenCalled();
      expect(client3.focus).not.toHaveBeenCalled();
    });

    it('focusメソッドがないクライアントは新規ウィンドウを開く', async () => {
      const targetUrl = '/new';
      const clientWithoutFocus = createMockClient(targetUrl, false);
      const mockClients = createMockClients([clientWithoutFocus]);

      const result = await handleNotificationClick({ url: targetUrl }, mockClients);

      expect(result.action).toBe('open');
      expect(mockClients.openWindow).toHaveBeenCalledWith(targetUrl);
    });
  });
});

describe('Service Worker - handlePush', () => {
  it('プッシュデータをパースして通知情報を返す', () => {
    const pushData = {
      title: 'ヒビオル',
      body: '今日はどんな一日だった？',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: '/new',
        type: 'main',
        notificationId: 'test-123',
      },
    };

    const result = handlePush(pushData);

    expect(result.title).toBe('ヒビオル');
    expect(result.options.body).toBe('今日はどんな一日だった？');
    // pushDataにiconが指定されている場合はその値を使用
    expect(result.options.icon).toBe('/icon-192.png');
    expect(result.options.badge).toBe('/badge-72.png');
    expect(result.options.data.url).toBe('/new');
    expect(result.options.data.type).toBe('main');
  });

  it('データがない場合はデフォルト値で通知情報を返す', () => {
    const result = handlePush(null);

    expect(result.title).toBe('ヒビオル');
    expect(result.options.body).toBe('今日の記録を残しましょう');
    expect(result.options.icon).toBe('/icon-192x192.png');
    expect(result.options.badge).toBe('/badge-72.png');
    expect(result.options.data.url).toBe('/');
  });
});
