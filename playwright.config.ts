import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// .env.localを読み込み（テストプロセス用）
config({ path: '.env.local' })

// E2Eテスト実行時の環境変数（認証必須テストの有効化）
process.env.PLAYWRIGHT_AUTH_ENABLED = 'true'

/**
 * Playwright設定
 * 認証機能のE2Eテスト用設定
 */
export default defineConfig({
  // テストファイルの場所
  testDir: './e2e',

  // 各テストのタイムアウト（30秒）
  timeout: 30 * 1000,

  // テストの期待値のタイムアウト
  expect: {
    timeout: 5000,
  },

  // テスト失敗時のリトライ
  retries: process.env.CI ? 2 : 0,

  // テストの並列実行を無効化（認証テストは状態に依存するため）
  fullyParallel: false,

  // テスト結果のレポーター
  reporter: [['html', { open: 'never' }], ['list']],

  // 共通設定
  use: {
    // ベースURL（ローカル開発サーバー）
    baseURL: 'http://localhost:3000',

    // テスト失敗時にスクリーンショットを取得
    screenshot: 'only-on-failure',

    // テスト失敗時にトレースを記録
    trace: 'on-first-retry',

    // ブラウザのビューポート
    viewport: { width: 1280, height: 720 },
  },

  // テスト対象のブラウザ
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 開発サーバーの起動設定
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    // 既存のサーバーを再利用（E2E_TEST_MODE=true で起動済みのサーバー）
    reuseExistingServer: true,
    timeout: 120 * 1000,
    // E2Eテストモードを有効化（認証バイパス用）
    env: {
      ...process.env,
      E2E_TEST_MODE: 'true',
      PLAYWRIGHT_AUTH_ENABLED: 'true',
    },
  },
})
