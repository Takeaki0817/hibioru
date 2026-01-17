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
