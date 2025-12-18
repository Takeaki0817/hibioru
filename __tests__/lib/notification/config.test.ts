/**
 * 通知設定（VAPID鍵、環境変数）のテスト
 *
 * 環境変数から通知設定を読み込む機能をテストします。
 */

import { getVapidConfig, validateVapidConfig } from '@/lib/notification/config';

describe('通知設定', () => {
  // 元の環境変数を保存
  const originalEnv = process.env;

  beforeEach(() => {
    // 各テスト前に環境変数をリセット
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // テスト後に元の環境変数を復元
    process.env = originalEnv;
  });

  describe('getVapidConfig', () => {
    it('環境変数からVAPID設定を取得する', () => {
      // Given: VAPID環境変数が設定されている
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // When: 設定を取得
      const config = getVapidConfig();

      // Then: 環境変数の値が取得できる
      expect(config.publicKey).toBe('test-public-key');
      expect(config.privateKey).toBe('test-private-key');
    });

    it('公開鍵が未設定の場合はundefinedを返す', () => {
      // Given: 公開鍵が未設定
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // When: 設定を取得
      const config = getVapidConfig();

      // Then: publicKeyはundefined
      expect(config.publicKey).toBeUndefined();
      expect(config.privateKey).toBe('test-private-key');
    });

    it('秘密鍵が未設定の場合はundefinedを返す', () => {
      // Given: 秘密鍵が未設定
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
      delete process.env.VAPID_PRIVATE_KEY;

      // When: 設定を取得
      const config = getVapidConfig();

      // Then: privateKeyはundefined
      expect(config.publicKey).toBe('test-public-key');
      expect(config.privateKey).toBeUndefined();
    });
  });

  describe('validateVapidConfig', () => {
    it('両方の鍵が設定されていればtrueを返す', () => {
      // Given: 両方の鍵が設定
      const config = {
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
      };

      // When: バリデーション
      const result = validateVapidConfig(config);

      // Then: trueを返す
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('公開鍵が未設定の場合はエラーを返す', () => {
      // Given: 公開鍵が未設定
      const config = {
        publicKey: undefined,
        privateKey: 'test-private-key',
      };

      // When: バリデーション
      const result = validateVapidConfig(config);

      // Then: エラーを返す
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
    });

    it('秘密鍵が未設定の場合はエラーを返す', () => {
      // Given: 秘密鍵が未設定
      const config = {
        publicKey: 'test-public-key',
        privateKey: undefined,
      };

      // When: バリデーション
      const result = validateVapidConfig(config);

      // Then: エラーを返す
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('VAPID_PRIVATE_KEY is not set');
    });

    it('両方の鍵が未設定の場合は両方のエラーを返す', () => {
      // Given: 両方の鍵が未設定
      const config = {
        publicKey: undefined,
        privateKey: undefined,
      };

      // When: バリデーション
      const result = validateVapidConfig(config);

      // Then: 両方のエラーを返す
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
      expect(result.errors).toContain('VAPID_PRIVATE_KEY is not set');
    });

    it('空文字の鍵はエラーとして扱う', () => {
      // Given: 鍵が空文字
      const config = {
        publicKey: '',
        privateKey: '',
      };

      // When: バリデーション
      const result = validateVapidConfig(config);

      // Then: エラーを返す
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Supabase Service Role Key', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('SUPABASE_SERVICE_ROLE_KEY環境変数が定義可能', () => {
    // Given: Service Role Keyが設定されている
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    // Then: 環境変数が読み取れる
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key');
  });
});
