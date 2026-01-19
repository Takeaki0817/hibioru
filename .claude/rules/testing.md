---
globs: **/__tests__/**/*.ts, **/*.test.ts, **/*.spec.ts, e2e/**/*.ts
---

# テスト規約

## ユニットテスト（Jest）

### ファイル配置

各フィーチャー内の `__tests__/` ディレクトリに配置。

```
src/features/entry/
├── api/
│   └── service.ts
├── __tests__/
│   └── service.test.ts   # service.tsのテスト
└── types.ts
```

### ファイル命名

- `*.test.ts` または `*.test.tsx`

### 実行コマンド

```bash
pnpm test                    # 全テスト実行
pnpm test:watch              # ウォッチモード
pnpm test:coverage           # カバレッジ付き
pnpm test -- path/to/test    # 単一テスト実行
```

## E2Eテスト（Playwright）

### ファイル配置

`e2e/` ディレクトリに配置。

```
e2e/
├── auth.spec.ts
├── entry-create.spec.ts
├── entry-edit-delete.spec.ts
├── timeline.spec.ts
└── fixtures/
    └── test-helpers.ts
```

### ファイル命名

- `*.spec.ts`

### 実行コマンド

```bash
pnpm exec playwright test           # 全E2Eテスト実行
pnpm exec playwright test --ui      # UIモードで実行
pnpm exec playwright test auth      # 特定ファイルのみ実行
```

### 設定

- ベースURL: `http://localhost:3000`
- ブラウザ: Chromium
- 失敗時: スクリーンショット + トレース記録

## テスト構造

Arrange-Act-Assert パターンを使用:

```typescript
test('ストリークが正しく計算される', () => {
  // Arrange: テストデータ準備
  const entries = [...]

  // Act: テスト対象の実行
  const result = calculateStreak(entries)

  // Assert: 結果の検証
  expect(result).toBe(5)
})
```

## data-testid 命名規約

E2Eテストで使用する`data-testid`属性の命名規約。

### 基本ルール

- **kebab-case を使用**: `data-testid="profile-avatar"`
- **コンポーネント名-要素名 形式**: `{component}-{element}`
- **一意性を確保**: 同一ページ内で重複しない命名

### 命名パターン

| パターン | 用途 | 例 |
|---------|------|-----|
| `{component}-{element}` | 基本要素 | `profile-avatar`, `entry-card` |
| `{component}-{action}-btn` | アクションボタン | `follow-action-btn`, `delete-btn` |
| `{list-name}-item` | リストアイテム | `follow-list-item`, `feed-item` |
| `{component}-{state}` | 状態表示 | `loading-spinner`, `empty-state` |
| `{feature}-tab` | タブ | `feed-tab`, `notification-tab` |

### 既存の命名例（プロジェクト内）

| 機能 | data-testid |
|------|------------|
| プロフィール | `profile-avatar`, `profile-username`, `profile-display-name` |
| フォロー | `follow-button`, `follow-list-item`, `follow-stats` |
| フィード | `feed-item`, `feed-tab`, `social-feed` |
| 通知 | `notification-item`, `notification-tab`, `notification-list` |
| エントリ | `entry-card`, `entry-content`, `entry-form` |
| タイムライン | `timeline-list`, `calendar-button` |

### コンポーネント実装時の注意

```tsx
// ✅ 良い例: 意味のある命名
<button data-testid="follow-button">フォロー</button>
<div data-testid="profile-section">...</div>

// ❌ 避ける例: 汎用的すぎる
<button data-testid="button1">フォロー</button>
<div data-testid="section">...</div>
```
