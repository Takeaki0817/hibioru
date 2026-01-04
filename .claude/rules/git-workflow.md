# Git ブランチ戦略

## ブランチ構成

```
main        ← 本番環境（プロダクション）
  └── develop   ← 開発用ベースブランチ
        ├── feature/*   ← 新機能開発
        ├── fix/*       ← バグ修正
        └── refactor/*  ← リファクタリング
```

## ブランチの役割

| ブランチ | 用途 | マージ先 |
|---------|------|----------|
| `main` | 本番環境。常にデプロイ可能な状態を維持 | - |
| `develop` | 開発用ベース。次回リリースの統合ブランチ | `main` |
| `feature/*` | 新機能開発 | `develop` |
| `fix/*` | バグ修正 | `develop` |
| `refactor/*` | リファクタリング | `develop` |

## ワークフロー

### 1. 新機能・修正の開発

```bash
# developから作業ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/機能名

# 開発完了後、developにPRを作成してマージ
gh pr create --base develop --head feature/機能名
```

### 2. 本番デプロイ

```bash
# developをmainにマージ
git checkout main
git pull origin main
git merge develop
git push origin main

# または PR経由でマージ
gh pr create --base main --head develop --title "Release: ..."
```

## 命名規則

- `feature/機能名` - 新機能（例: `feature/social-feed`）
- `fix/修正内容` - バグ修正（例: `fix/timeline-scroll`）
- `refactor/対象` - リファクタリング（例: `refactor/notification-hooks`）
- `chore/内容` - 雑務（例: `chore/update-dependencies`）

## 注意事項

- `main` への直接コミットは禁止
- `develop` への直接コミットも原則禁止（小さな修正のみ例外）
- PRマージ時は Squash merge を推奨（履歴をクリーンに保つ）
- 作業ブランチはマージ後に削除
