# ギャップ分析レポート: auth

## 概要

| 項目 | 状況 |
|------|------|
| 仕様書 | `.kiro/specs/auth/requirements.md`, `design.md`, `tasks.md` |
| 実装 | `src/features/auth/` |
| 分析日 | 2026-01-17 |

## ギャップ一覧

### 1. Error Boundary 未実装

| 項目 | 内容 |
|------|------|
| 仕様 | エラーハンドリング用のError Boundaryを実装 |
| 実装 | 未実装 |
| 優先度 | 中 |
| 影響 | 認証エラー時のUX低下 |

**対応案**: `src/app/auth/error.tsx` または `src/features/auth/components/auth-error-boundary.tsx` を作成

### 2. リダイレクトURL保持 未実装

| 項目 | 内容 |
|------|------|
| 仕様 | 認証前のページURLを保持し、認証後にリダイレクト |
| 実装 | 未実装（常に `/timeline` へリダイレクト） |
| 優先度 | 低 |
| 影響 | UX向上の機会損失 |

**関連ファイル**:
- `middleware.ts`
- `src/app/auth/callback/route.ts`

**対応案**: `searchParams` に `redirect` パラメータを追加し、callback時に利用

### 3. GoogleButtonコンポーネントの分離

| 項目 | 内容 |
|------|------|
| 仕様 | 明示なし |
| 実装 | `login-form.tsx` 内にインライン実装 |
| 優先度 | 低 |
| 影響 | 再利用性・テスト容易性 |

**対応案**: `src/features/auth/components/google-button.tsx` として分離

### 4. テスト未実装

| 項目 | 内容 |
|------|------|
| 仕様 | ユニットテスト・E2Eテスト |
| 実装 | 未実装（削除済み） |
| 優先度 | 高 |
| 影響 | 品質保証 |

## 仕様書更新の必要性

| 項目 | 更新内容 |
|------|---------|
| なし | 仕様書は現状維持 |

## テスト観点

### ユニットテスト

- [ ] `service.ts`: signInWithGoogle, signOut, deleteAccount
- [ ] `deleteUserData`: 全関連データの削除確認

### E2Eテスト

- [ ] Googleログインフロー（OAuth mock）
- [ ] ログアウトフロー
- [ ] アカウント削除フロー
- [ ] 未認証時のリダイレクト

## 結論

実装は基本機能を満たしているが、Error BoundaryとリダイレクトURL保持が未実装。テスト再構築時にこれらの欠落を考慮する。
