# 技術スタック

## アーキテクチャ

**フルスタックJamstack構成**
- フロントエンド: Next.js App Router (RSC対応)
- バックエンド: Supabase (BaaS)
- ホスティング: Vercel
- PWAによるマルチデバイス対応

---

## コア技術

- **言語**: TypeScript (Latest)
- **フレームワーク**: Next.js 16 (App Router)
- **ランタイム**: Node.js 20+
- **スタイリング**: Tailwind CSS v4
- **パッケージマネージャー**: pnpm

---

## 主要ライブラリ

| カテゴリ | 技術 | 用途 |
|----------|------|------|
| バックエンド/DB | Supabase | PostgreSQL、Auth、Storage、Realtime |
| 認証 | Supabase Auth | Google OAuth |
| 画像処理 | browser-image-compression | クライアント側WebP変換・圧縮 |
| PWA | next-pwa (または同等) | オフライン対応、プッシュ通知 |

---

## 開発標準

### TypeScript規約

```typescript
// 厳格モード必須
// any型の使用禁止
// インターフェースでの型定義推奨

interface Entry {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
}
```

### コード品質

- ESLint + Prettier による自動フォーマット
- コミット前のリント実行推奨

### テスト（Phase 2以降）

- Jest + React Testing Library
- 重要なビジネスロジック（ストリーク計算、ほつれ消費）を優先

---

## 開発環境

### 必須ツール

- Node.js 20+
- pnpm（推奨）または npm
- Supabase CLI（ローカル開発用）

### 基本コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# Supabaseローカル起動
supabase start
```

---

## 重要な技術決定

### Next.js App Router採用

**理由**:
- React Server Components によるパフォーマンス最適化
- レイアウト・ローディング状態の宣言的管理
- Vercelとの最適な統合

### Supabase採用

**理由**:
- Auth・DB・Realtimeが一発で揃う
- 無料枠が広い（個人開発に最適）
- PostgreSQLベースで将来的な移行も容易

**無料枠の制約**:
| 項目 | 無料枠 | 想定使用量 |
|------|--------|-----------|
| DB | 500MB | 日記数年分 |
| Storage | 1GB | 約10,000枚 |
| Egress | 10GB/月 | 注意が必要 |

**注意**: 1週間非アクティブで自動停止 -> 本番はProプラン移行

### PWA採用

**理由**:
- あらゆるデバイスから入力したい
- ネイティブアプリは開発コストが高い
- プッシュ通知はWeb Push APIで実現

### クライアント側画像圧縮

**理由**:
- サーバー負荷軽減
- アップロード時間短縮
- Storage容量節約（200KB以下に圧縮）

---

## API設計方針

### データエクスポート（AI連携）

```
GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/export?format=json|markdown
```

本人の投稿データをAI（Claude等）に渡して振り返り・分析に活用。
Phase 2以降でMCPサーバー対応予定。

---

## MCP Servers（開発支援ツール）

プロジェクトでは以下のMCPサーバーを利用可能（`.mcp.json`参照）：

| サーバー名 | 用途 |
|-----------|------|
| **mcp__next-devtools** | Next.js 16の初期構築、設定、トラブルシューティング |
| **mcp__supabase** | Supabase操作（Database、Auth、Storage、Functions等） |
| **mcp__serena** | IDE assistant、コンテキスト対応の開発支援 |
| **mcp__vercel-awesome-ai** | Vercelデプロイ・設定支援 |
| **mcp__gcloud** | Google Cloud関連操作 |

### 使用方針

- **初期構築**: 各技術スタックに対応するMCPサーバーを優先的に使用
- **エラー解決**: 該当するMCPサーバーを通じてトラブルシューティング
- **ベストプラクティス**: MCPサーバー経由で最新の推奨設定を確認

---
_標準とパターンを記載、全依存関係のリストではない_
