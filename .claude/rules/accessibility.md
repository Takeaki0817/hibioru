---
paths: src/components/**/*.tsx, src/features/**/components/**/*.tsx
---

# アクセシビリティ規約

## WCAG 2.1 AA 準拠チェックリスト

### キーボードナビゲーション
- [ ] すべてのインタラクティブ要素がTab到達可能
- [ ] フォーカス順序が論理的
- [ ] フォーカス状態が視覚的に明確
- [ ] Escapeでモーダル/ドロップダウン閉じる

### ARIA実装

```typescript
// ✅ ローディング状態
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Skeleton /> : <Content />}
</div>

// ✅ トグルボタン
<button aria-pressed={isActive} onClick={toggle}>
  {isActive ? 'オン' : 'オフ'}
</button>

// ✅ モーダル
<Dialog aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">タイトル</h2>
  <p id="dialog-desc">説明</p>
</Dialog>
```

### セマンティックHTML

| 用途 | 推奨要素 |
|------|---------|
| ナビゲーション | `<nav>`, `<header>`, `<main>`, `<footer>` |
| リスト | `<ul>`, `<ol>`, `<li>` |
| 見出し階層 | `<h1>` → `<h2>` → `<h3>`（スキップ禁止） |
| ボタン | `<button>`（`<div onClick>` 禁止） |

### フォーム

```typescript
// ✅ ラベル関連付け
<label htmlFor="email">メールアドレス</label>
<input id="email" type="email" aria-describedby="email-hint" />
<span id="email-hint">例: user@example.com</span>

// ✅ エラー表示
<input aria-invalid={!!error} aria-describedby="email-error" />
{error && <span id="email-error" role="alert">{error}</span>}
```

### コントラスト比

| 要素 | 最小比率 |
|------|---------|
| 通常テキスト | 4.5:1 |
| 大きいテキスト（18px+） | 3:1 |
| UIコンポーネント | 3:1 |

## ADHD配慮設計

- 最小入力単位（絵文字1つでOK）
- 明確なフィードバック（成功/エラー）
- 自動保存（入力消失防止）
- 視覚的進捗表示（ストリーク）

## テスト

```bash
# axe-core によるスキャン
pnpm exec playwright test accessibility

# 手動確認
# 1. Tab キーのみで操作
# 2. スクリーンリーダー（VoiceOver）
# 3. 200% ズーム
```
