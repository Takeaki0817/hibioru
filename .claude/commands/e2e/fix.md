# E2E修正: テスト失敗時の実装修正と再検証

E2Eテストの失敗原因を分析し、実装を修正して再検証を行います。

## 引数
- `$ARGUMENTS`: 修正対象の機能名（auth, timeline, entry-input, streak, mypage, notification）
  - 省略時: 全失敗テストを対象

## 実行手順

### 1. 失敗テストの特定

まず、現在の失敗テストを確認します：

```bash
npx playwright test e2e/$ARGUMENTS.spec.ts --reporter=list 2>&1 | head -100
```

失敗したテストをリストアップしてください。

### 2. 失敗原因の分析

各失敗テストについて以下を分析：

```markdown
### 失敗テスト: [テスト名]

**エラー内容:**
[Playwrightのエラーメッセージ]

**原因分析:**
- [ ] 実装の問題（機能が未実装/バグ）
- [ ] テストの問題（セレクタ不正/タイミング問題）
- [ ] 環境の問題（サーバー未起動/DB状態）
- [ ] 仕様変更（要件変更に伴う修正必要）

**該当コード:**
[ファイルパス:行番号]
```

### 3. 修正方針の決定

原因に応じた修正アプローチ：

| 原因 | アプローチ |
|------|-----------|
| 実装の問題 | コードを修正 → テスト再実行 |
| テストの問題 | テストコードを修正 → 再実行 |
| 環境の問題 | 環境を修正 → 再実行 |
| 仕様変更 | 仕様確認 → 実装/テスト両方を更新 |

### 4. 修正の実施

#### 実装修正の場合
1. 該当ファイルを特定（Serena MCPを活用）
2. 仕様を確認（`.kiro/specs/$ARGUMENTS/`）
3. コードを修正
4. 関連する単体テストがあれば実行

#### テスト修正の場合
1. セレクタの確認（ページの実際の構造を確認）
2. 待機時間の調整（必要に応じて `waitFor` 追加）
3. アサーションの修正

### 5. 修正後の再検証

```bash
# 特定のテストのみ実行
npx playwright test e2e/$ARGUMENTS.spec.ts -g "[テスト名]" --reporter=list

# 機能全体の再検証
npx playwright test e2e/$ARGUMENTS.spec.ts --reporter=list
```

### 6. 修正レポート

```markdown
## E2E修正レポート: [機能名]

### 修正サマリー
- 修正前の失敗テスト: X件
- 修正後の成功: X件
- 残存する問題: X件

### 修正内容

#### 1. [テスト名]
- **原因**: [分析結果]
- **修正ファイル**: [パス]
- **修正内容**: [変更の概要]
- **結果**: ✅ 成功 / ❌ 未解決

```diff
- 修正前のコード
+ 修正後のコード
```

#### 2. [テスト名]
...

### 残存する問題
| テスト | 状況 | 次のアクション |
|--------|------|----------------|
| [名前] | [状況] | [提案] |

### 追加で必要な対応
- [ ] [アクション1]
- [ ] [アクション2]
```

### 7. 次のステップ

**全て成功した場合:**
- `/e2e:verify $ARGUMENTS` で最終確認
- または `/e2e:verify-all` で全体確認

**まだ失敗がある場合:**
- 残存問題の詳細を報告
- 追加調査が必要な場合はユーザーに確認

## 一般的な失敗パターンと対処法

### セレクタが見つからない
```typescript
// 問題: 要素が見つからない
await page.click('button.submit')

// 対処1: より具体的なセレクタ
await page.getByRole('button', { name: '投稿する' }).click()

// 対処2: 待機を追加
await page.waitForSelector('button.submit')
await page.click('button.submit')
```

### タイミング問題
```typescript
// 問題: 要素がまだ表示されていない
await expect(page.locator('.result')).toBeVisible()

// 対処: タイムアウトを延長
await expect(page.locator('.result')).toBeVisible({ timeout: 10000 })
```

### 認証状態の問題
```typescript
// 問題: 認証が必要なページにアクセス
test.beforeEach(async ({ page }) => {
  // 認証状態をセットアップ
  await page.goto('/login')
  // ... ログイン処理
})
```

### リダイレクトの検証
```typescript
// 問題: リダイレクト先のURLが部分一致しない
await expect(page).toHaveURL(/\/login/)  // 正規表現を使用
```

## 注意事項
- 修正は最小限に留める（関連箇所のみ）
- 修正後は必ず再テストを実行
- 仕様変更が必要な場合はユーザーに確認を取る
- 不明な点は `/e2e:verify $ARGUMENTS` で詳細分析
