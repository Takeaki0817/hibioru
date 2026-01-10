/**
 * LP用のモバイルスクリーンショットを撮影するスクリプト
 *
 * 使用方法:
 * npx tsx scripts/take-lp-screenshots.ts
 */

import { chromium, devices } from '@playwright/test'

const MOBILE_DEVICE = devices['iPhone 14 Pro']
const BASE_URL = 'http://localhost:3000'
const OUTPUT_DIR = 'public/lp'

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...MOBILE_DEVICE,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  })

  const page = await context.newPage()

  console.log('📱 モバイルビュー設定完了:', MOBILE_DEVICE.viewport)

  // ========================================
  // 1. ログイン画面
  // ========================================
  console.log('📸 ログイン画面を撮影中...')
  await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // PWAインストールプロンプトを閉じる
  const closeButton = page.locator('button:has-text("後で")').first()
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click()
    await page.waitForTimeout(500)
  }

  await page.screenshot({
    path: `${OUTPUT_DIR}/screenshot-login.png`,
    fullPage: false,
  })
  console.log('✅ ログイン画面を保存しました')

  // ========================================
  // 2. LPのスマホモック（Heroセクション用）
  // ========================================
  console.log('📸 LPモック画面（Hero用）を撮影中...')
  await page.goto(`${BASE_URL}/lp`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Heroセクションのスマホモック
  const heroMock = page.locator('.phone-mock').first()
  if (await heroMock.isVisible({ timeout: 2000 }).catch(() => false)) {
    await heroMock.screenshot({
      path: `${OUTPUT_DIR}/screenshot-hero-mock.png`,
    })
    console.log('✅ Heroモック画面を保存しました')
  }

  // ========================================
  // 3. LPのスマホモック（Demoセクション用）
  // ========================================
  console.log('📸 LPモック画面（Demo用）を撮影中...')

  // Demoセクションまでスクロール
  const demoSection = page.locator('section').filter({ hasText: '2タップで、こんなに簡単' }).first()
  if (await demoSection.isVisible({ timeout: 2000 }).catch(() => false)) {
    await demoSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Demoセクションのスマホモック
    const demoMock = demoSection.locator('.phone-mock').first()
    if (await demoMock.isVisible({ timeout: 2000 }).catch(() => false)) {
      await demoMock.screenshot({
        path: `${OUTPUT_DIR}/screenshot-demo-mock.png`,
      })
      console.log('✅ Demoモック画面を保存しました')
    }
  }

  await browser.close()
  console.log('🎉 スクリーンショット撮影完了！')
  console.log(`📁 出力先: ${OUTPUT_DIR}/`)
}

takeScreenshots().catch(console.error)
