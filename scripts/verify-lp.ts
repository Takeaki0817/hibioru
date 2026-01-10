/**
 * 更新されたLPページを確認するスクリプト
 */

import { chromium, devices } from '@playwright/test'

const MOBILE_DEVICE = devices['iPhone 14 Pro']
const BASE_URL = 'http://localhost:3000'

async function verifyLP() {
  const browser = await chromium.launch({ headless: true })

  // デスクトップビュー
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ja-JP',
  })
  const desktopPage = await desktopContext.newPage()

  console.log('🖥️ デスクトップビューでLPを確認中...')
  await desktopPage.goto(`${BASE_URL}/lp`, { waitUntil: 'networkidle' })
  await desktopPage.waitForTimeout(1000)

  await desktopPage.screenshot({
    path: 'public/lp/verify-desktop.png',
    fullPage: false,
  })
  console.log('✅ デスクトップビュー保存')

  // モバイルビュー
  const mobileContext = await browser.newContext({
    ...MOBILE_DEVICE,
    locale: 'ja-JP',
  })
  const mobilePage = await mobileContext.newPage()

  console.log('📱 モバイルビューでLPを確認中...')
  await mobilePage.goto(`${BASE_URL}/lp`, { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1000)

  await mobilePage.screenshot({
    path: 'public/lp/verify-mobile.png',
    fullPage: false,
  })
  console.log('✅ モバイルビュー保存')

  await browser.close()
  console.log('🎉 確認完了！')
}

verifyLP().catch(console.error)
