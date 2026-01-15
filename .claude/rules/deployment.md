# デプロイメントガイド

## 本番デプロイ前チェックリスト

### 1. コード品質
- [ ] `pnpm lint` パス
- [ ] `pnpm build` 成功
- [ ] `pnpm test` パス
- [ ] TypeScript エラーなし

### 2. データベース
- [ ] `pnpm db:types` 最新
- [ ] マイグレーション適用済み（`pnpm db:push`）
- [ ] RLSポリシー確認
- [ ] バックアップ取得（`pnpm db:backup`）

### 3. 環境変数（Vercel）
| 変数 | 用途 |
|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 匿名キー |
| SUPABASE_SERVICE_ROLE_KEY | Admin操作用 |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Push通知 |
| VAPID_PRIVATE_KEY | Push署名 |
| STRIPE_SECRET_KEY | Stripe API |
| STRIPE_WEBHOOK_SECRET | Webhook検証 |

### 4. セキュリティ確認
- [ ] CSPヘッダー設定（next.config.ts）
- [ ] 本番URLがサイトURLに設定
- [ ] OAuth リダイレクトURL更新

## デプロイフロー

```bash
# 1. developで動作確認
git checkout develop && pnpm dev

# 2. mainへマージ
git checkout main && git merge develop

# 3. Vercel自動デプロイ
git push origin main
```

## ロールバック

```bash
# Vercel CLIでロールバック
vercel rollback
```

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| ビルド失敗 | 型エラー | `pnpm build` でローカル確認 |
| 認証エラー | 環境変数 | Vercelダッシュボードで確認 |
| DB接続失敗 | IPホワイトリスト | Supabaseでネットワーク設定 |
| Webhook失敗 | シークレット不一致 | Stripe CLIで再取得 |
