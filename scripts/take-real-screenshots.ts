/**
 * 実際のアプリ画面スクリーンショット撮影スクリプト
 *
 * 使用方法:
 * 1. npx tsx scripts/take-real-screenshots.ts
 * 2. ブラウザが開いたらGoogleでログイン
 * 3. ログイン完了後、ターミナルでEnterキーを押す
 * 4. 自動でスクリーンショットが撮影される
 */

import { chromium, devices } from '@playwright/test'
import * as readline from 'readline'

const MOBILE_DEVICE = devices['iPhone 14 Pro']
const BASE_URL = 'http://localhost:3000'
const OUTPUT_DIR = 'public/lp'

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

async function takeRealScreenshots() {
  console.log('🚀 実際のアプリ画面スクリーンショット撮影を開始します\n')

  const browser = await chromium.launch({
    headless: false, // ブラウザを表示
    slowMo: 100, // 操作を見やすくするため少し遅延
  })

  const context = await browser.newContext({
    ...MOBILE_DEVICE,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  })

  const page = await context.newPage()

  console.log('📱 モバイルビュー設定完了:', MOBILE_DEVICE.viewport)
  console.log('🌐 ブラウザを開いています...\n')

  // タイムラインページに移動（ログイン画面にリダイレクト）
  await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'networkidle' })

  // PWAインストールプロンプトを閉じる
  await page.waitForTimeout(1500)
  const closeButton = page.locator('button:has-text("後で")').first()
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click()
    console.log('✅ PWAプロンプトを閉じました')
  }

  console.log('\n' + '='.repeat(50))
  console.log('📝 ブラウザでGoogleログインを完了してください')
  console.log('='.repeat(50) + '\n')

  await waitForEnter('✅ ログイン完了後、Enterキーを押してください...')

  console.log('\n📸 スクリーンショット撮影を開始します...\n')

  // ページをリロードしてログイン状態を反映
  await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // ========================================
  // 1. タイムライン画面
  // ========================================
  console.log('📸 タイムライン画面を撮影中...')
  await page.screenshot({
    path: `${OUTPUT_DIR}/screenshot-timeline-real.png`,
    fullPage: false,
  })
  console.log('✅ タイムライン画面を保存しました')

  // ========================================
  // 2. 入力画面（テキストエリアにフォーカス）
  // ========================================
  console.log('📸 入力画面を撮影中...')

  // テキストエリアを探す
  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textarea.click()
    await page.waitForTimeout(500)

    // サンプルテキストを入力
    await textarea.fill('今日は散歩した 🚶')
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `${OUTPUT_DIR}/screenshot-input-real.png`,
      fullPage: false,
    })
    console.log('✅ 入力画面を保存しました')

    // 入力をクリア
    await textarea.fill('')
  } else {
    console.log('⚠️ テキストエリアが見つかりませんでした')
  }

  await browser.close()

  console.log('\n' + '='.repeat(50))
  console.log('🎉 スクリーンショット撮影完了！')
  console.log(`📁 出力先: ${OUTPUT_DIR}/`)
  console.log('='.repeat(50))
}

takeRealScreenshots().catch(console.error)
