import { test, expect } from '@playwright/test'

/**
 * 認証機能のE2Eテスト
 * ログインページ、リダイレクト、エラーハンドリングを検証
 */
test.describe('認証機能', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login')
    // ヒビオルのタイトルが表示されることを確認
    await expect(page.getByText('ヒビオル')).toBeVisible()
  })

  test('Googleログインボタンが存在する', async ({ page }) => {
    await page.goto('/login')
    // Googleログインボタンが表示されることを確認
    const googleButton = page.getByRole('button', { name: /Google/i })
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()
  })

  test('未認証でホームにアクセスするとログインにリダイレクト', async ({ page }) => {
    // 認証なしでルートパスにアクセス
    await page.goto('/')
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/login/)
  })

  test('エラーパラメータがあるときエラーメッセージが表示される', async ({ page }) => {
    // エラーパラメータ付きでログインページにアクセス
    await page.goto('/login?error=auth_failed')
    // エラーメッセージが表示されることを確認
    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()
  })

  test('エラー時に再試行ボタンが表示される', async ({ page }) => {
    // エラーパラメータ付きでログインページにアクセス
    await page.goto('/login?error=auth_failed')
    // 再試行ボタンが表示されることを確認
    await expect(page.getByText(/もう一度試す/)).toBeVisible()
  })

  test('再試行ボタンをクリックするとエラーがクリアされる', async ({ page }) => {
    // エラーパラメータ付きでログインページにアクセス
    await page.goto('/login?error=auth_failed')

    // エラーメッセージが表示されている
    await expect(page.getByText(/ログインできませんでした/)).toBeVisible()

    // 再試行ボタンをクリック
    await page.getByText(/もう一度試す/).click()

    // エラーメッセージが消える
    await expect(page.getByText(/ログインできませんでした/)).not.toBeVisible()

    // ログインボタンは引き続き使用可能
    await expect(page.getByRole('button', { name: /Google/i })).toBeEnabled()
  })

  test('ログインページのUIが正しく表示される', async ({ page }) => {
    await page.goto('/login')

    // サービス名が表示される
    await expect(page.getByText('ヒビオル')).toBeVisible()

    // キャッチコピーが表示される
    await expect(page.getByText('日々を織る')).toBeVisible()

    // Googleログインボタンが存在する
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('ログインボタンがクリック可能で有効である', async ({ page }) => {
    await page.goto('/login')

    const googleButton = page.getByRole('button', { name: /Google/i })

    // ボタンが表示され、クリック可能であることを確認
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()

    // aria-labelが設定されていることを確認（アクセシビリティ）
    await expect(googleButton).toHaveAttribute('aria-label', 'Googleでログイン')

    // ボタンにGoogleアイコン（SVG）が含まれていることを確認
    const svg = googleButton.locator('svg')
    await expect(svg).toBeVisible()
  })

  test('認証キャンセル時はエラーメッセージなしでログインページに戻る', async ({ page }) => {
    // 認証キャンセルのコールバックをシミュレート
    await page.goto('/auth/callback?error=access_denied')

    // ログインページにリダイレクトされる
    await expect(page).toHaveURL('/login')

    // エラーメッセージは表示されない
    await expect(page.getByText(/ログインできませんでした/)).not.toBeVisible()
  })
})
