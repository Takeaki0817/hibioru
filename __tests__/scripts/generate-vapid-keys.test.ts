/**
 * VAPID鍵生成スクリプトのテスト
 *
 * web-pushライブラリを使用した鍵生成機能をテストします。
 */

import webpush from 'web-push';

describe('VAPID鍵生成', () => {
  describe('web-push.generateVAPIDKeys', () => {
    it('公開鍵と秘密鍵のペアを生成する', () => {
      // Given: web-pushライブラリが利用可能

      // When: VAPID鍵を生成
      const vapidKeys = webpush.generateVAPIDKeys();

      // Then: 公開鍵と秘密鍵が存在する
      expect(vapidKeys).toHaveProperty('publicKey');
      expect(vapidKeys).toHaveProperty('privateKey');
      expect(typeof vapidKeys.publicKey).toBe('string');
      expect(typeof vapidKeys.privateKey).toBe('string');
    });

    it('公開鍵はBase64 URL-safe形式（約87文字）である', () => {
      // Given: web-pushライブラリが利用可能

      // When: VAPID鍵を生成
      const vapidKeys = webpush.generateVAPIDKeys();

      // Then: 公開鍵はBase64 URL-safe形式
      // VAPID公開鍵は65バイト = 87文字のBase64 URL-safe文字列
      expect(vapidKeys.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(vapidKeys.publicKey.length).toBeGreaterThanOrEqual(80);
      expect(vapidKeys.publicKey.length).toBeLessThanOrEqual(100);
    });

    it('秘密鍵はBase64 URL-safe形式（約43文字）である', () => {
      // Given: web-pushライブラリが利用可能

      // When: VAPID鍵を生成
      const vapidKeys = webpush.generateVAPIDKeys();

      // Then: 秘密鍵はBase64 URL-safe形式
      // VAPID秘密鍵は32バイト = 43文字のBase64 URL-safe文字列
      expect(vapidKeys.privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(vapidKeys.privateKey.length).toBeGreaterThanOrEqual(40);
      expect(vapidKeys.privateKey.length).toBeLessThanOrEqual(50);
    });

    it('生成するたびに異なる鍵ペアが生成される', () => {
      // Given: web-pushライブラリが利用可能

      // When: VAPID鍵を2回生成
      const keys1 = webpush.generateVAPIDKeys();
      const keys2 = webpush.generateVAPIDKeys();

      // Then: 異なる鍵ペアが生成される
      expect(keys1.publicKey).not.toBe(keys2.publicKey);
      expect(keys1.privateKey).not.toBe(keys2.privateKey);
    });

    it('生成された鍵ペアはsetVapidDetailsで使用できる', () => {
      // Given: VAPID鍵ペアを生成
      const vapidKeys = webpush.generateVAPIDKeys();

      // When: setVapidDetailsで設定
      // Then: エラーが発生しない
      expect(() => {
        webpush.setVapidDetails(
          'mailto:test@example.com',
          vapidKeys.publicKey,
          vapidKeys.privateKey
        );
      }).not.toThrow();
    });
  });

  describe('環境変数形式', () => {
    it('NEXT_PUBLIC_VAPID_PUBLIC_KEY形式で出力可能', () => {
      // Given: VAPID鍵ペアを生成
      const vapidKeys = webpush.generateVAPIDKeys();

      // When: 環境変数形式に変換
      const envFormat = `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`;

      // Then: 正しい形式で出力される
      expect(envFormat).toMatch(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=[A-Za-z0-9_-]+$/);
    });

    it('VAPID_PRIVATE_KEY形式で出力可能', () => {
      // Given: VAPID鍵ペアを生成
      const vapidKeys = webpush.generateVAPIDKeys();

      // When: 環境変数形式に変換
      const envFormat = `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;

      // Then: 正しい形式で出力される
      expect(envFormat).toMatch(/^VAPID_PRIVATE_KEY=[A-Za-z0-9_-]+$/);
    });
  });
});
