---
paths:
  - ".mcp.json"
---

# MCP 活用ガイド

`.mcp.json` に定義されたMCPサーバーが利用可能です。

## データベース・バックエンド

### supabase

**用途**: DB操作・スキーマ確認・Edge Functions管理

**主なツール**:
| ツール | 用途 |
|--------|------|
| `get_tables` | テーブル一覧取得 |
| `get_table_schema` | テーブル構造確認 |
| `execute_sql` | SQLクエリ実行（読み取り推奨） |
| `get_functions` | Edge Functions一覧 |

**使用例**:
```bash
# テーブル一覧取得
mcp__supabase__get_tables

# スキーマ確認
mcp__supabase__get_table_schema --table entries

# SQLクエリ実行
mcp__supabase__execute_sql --query "SELECT * FROM entries LIMIT 10"
```

**注意**:
- 本番DBへの書き込みクエリは慎重に
- ローカル開発時はDocker上のSupabaseを使用

---

## コード理解・編集

### serena

**用途**: LSPベースのシンボル検索・編集・リファクタリング

**主なツール**:
| ツール | 用途 |
|--------|------|
| `find_symbol` | シンボル定義を検索 |
| `find_referencing_symbols` | シンボルの参照箇所を検索 |
| `get_symbols_overview` | ファイル内シンボル一覧 |
| `replace_symbol_body` | シンボル本体を置換 |
| `insert_after_symbol` | シンボル後にコード挿入 |
| `insert_before_symbol` | シンボル前にコード挿入 |
| `rename_symbol` | シンボル名を一括変更 |
| `write_memory` | セッション学習メモを保存 |
| `read_memory` | 保存したメモを読み込み |
| `list_memories` | メモ一覧 |

**使用例**:
```bash
# シンボル検索（クラス、関数、変数など）
mcp__serena__find_symbol --name_path_pattern "TimelineClient"
mcp__serena__find_symbol --name_path_pattern "useStreak" --relative_path "src/features/streak"

# 参照追跡（影響分析に有用）
mcp__serena__find_referencing_symbols --name_path "authenticate" --relative_path "src/features/auth"

# ファイル内シンボル一覧
mcp__serena__get_symbols_overview --relative_path "src/features/timeline/components/timeline-list.tsx"

# シンボル単位の編集
mcp__serena__replace_symbol_body --name_path "MyClass/myMethod" --relative_path "src/..." --body "function myMethod() { ... }"
mcp__serena__insert_after_symbol --name_path "MyClass" --relative_path "src/..." --body "  newMethod() { ... }"

# セッション間でのメモ管理
mcp__serena__write_memory --memory_file_name "refactoring-plan" --content "..."
mcp__serena__list_memories
mcp__serena__read_memory --memory_file_name "refactoring-plan"
```

**ベストプラクティス**:
1. 編集前に必ず `find_symbol` で対象を確認
2. `find_referencing_symbols` で影響範囲を把握
3. 大規模リファクタリング時は `rename_symbol` を活用

**ripgrep との使い分け**:
| タスク | 推奨ツール |
|--------|-----------|
| テキスト/コメント検索 | ripgrep (Grep) |
| シンボル定義検索 | serena |
| 参照追跡 | serena |
| シンボル単位の編集 | serena |

---

## テスト・ブラウザ操作

### playwright-test

**用途**: E2Eテスト実行・デバッグ

**主なツール**:
| ツール | 用途 |
|--------|------|
| `test_run` | テスト実行 |
| `test_list` | テスト一覧 |
| `test_debug` | デバッグモード実行 |
| `browser_snapshot` | ブラウザ状態取得 |

**使用例**:
```bash
# テスト実行
mcp__playwright-test__test_run --spec "e2e/auth.spec.ts"

# テスト一覧
mcp__playwright-test__test_list

# デバッグ実行
mcp__playwright-test__test_debug --spec "e2e/timeline.spec.ts" --test "should display entries"
```

---

### playwright

**用途**: 直接ブラウザ操作（テスト外）

**主なツール**:
| ツール | 用途 |
|--------|------|
| `browser_navigate` | URL遷移 |
| `browser_click` | 要素クリック |
| `browser_type` | テキスト入力 |
| `browser_snapshot` | 現在の状態取得 |
| `browser_take_screenshot` | スクリーンショット |

**使用例**:
```bash
# ページ遷移
mcp__playwright__browser_navigate --url "http://localhost:3000/timeline"

# スナップショット（現在の状態を把握）
mcp__playwright__browser_snapshot

# 操作
mcp__playwright__browser_click --selector "[data-testid='add-entry']"
mcp__playwright__browser_type --selector "input[name='content']" --text "今日の記録"
```

---

## UI・フロントエンド

### shadcn

**用途**: UIコンポーネント追加・確認

**主なツール**:
| ツール | 用途 |
|--------|------|
| `get_project_registries` | 利用可能レジストリ |
| `view_items_in_registries` | コンポーネント一覧 |
| `get_item_examples_from_registries` | 使用例取得 |
| `get_add_command_for_items` | 追加コマンド生成 |

**使用例**:
```bash
# コンポーネント一覧確認
mcp__shadcn__view_items_in_registries

# 使用例取得
mcp__shadcn__get_item_examples_from_registries --items "dialog"

# 追加コマンド取得
mcp__shadcn__get_add_command_for_items --items "dialog,sheet,drawer"
# → pnpm dlx shadcn@latest add dialog sheet drawer
```

---

## インフラ・デプロイ

### vercel-awesome-ai

**用途**: Vercelプロジェクト操作・ドキュメント検索

**主なツール**:
| ツール | 用途 |
|--------|------|
| `list_projects` | プロジェクト一覧 |
| `search_vercel_documentation` | ドキュメント検索 |

**使用例**:
```bash
# プロジェクト確認
mcp__vercel-awesome-ai__list_projects

# ドキュメント検索
mcp__vercel-awesome-ai__search_vercel_documentation --query "edge functions"
```

---

### gcloud

**用途**: Google Cloud操作

**主なツール**:
| ツール | 用途 |
|--------|------|
| `run_gcloud_command` | gcloudコマンド実行 |

**使用例**:
```bash
mcp__gcloud__run_gcloud_command --command "projects list"
```

---

## 開発ツール

### next-devtools

**用途**: Next.js開発支援

**注意**: 開発サーバー起動中に使用

---

### context7

**用途**: ライブラリ・フレームワークの最新ドキュメント検索

**主なツール**:
| ツール | 用途 |
|--------|------|
| `resolve-library-id` | ライブラリ名からContext7 IDを取得 |
| `query-docs` | ドキュメント・コード例を検索 |

**使用例**:
```bash
# Step 1: ライブラリIDを取得
mcp__context7__resolve-library-id --libraryName "next.js" --query "app router data fetching"
# → libraryId: "/vercel/next.js" を取得

# Step 2: ドキュメントを検索
mcp__context7__query-docs --libraryId "/vercel/next.js" --query "server actions best practices"
```

**よく使うライブラリID**:
| ライブラリ | ID |
|-----------|-----|
| Next.js | `/vercel/next.js` |
| React | `/facebook/react` |
| TanStack Query | `/tanstack/query` |
| Supabase | `/supabase/supabase` |
| Tailwind CSS | `/tailwindlabs/tailwindcss` |
| shadcn/ui | `/shadcn-ui/ui` |
| Zustand | `/pmndrs/zustand` |
| Playwright | `/microsoft/playwright` |

**使用場面**:
- 新しいAPIの使い方を調べたい
- ライブラリのベストプラクティスを確認したい
- 公式ドキュメントの最新情報が必要な場合

**注意**:
- 1つの質問につき最大3回までの呼び出しを推奨
- まず `resolve-library-id` でIDを取得してから `query-docs` を使用

---

## MCP選択フローチャート

```
何をしたいか？
    │
    ├─ DBを確認・操作したい → supabase
    │
    ├─ コードを理解したい
    │   ├─ シンボル単位で検索 → serena
    │   └─ テキスト検索 → Grep（ripgrep）
    │
    ├─ ライブラリの使い方を調べたい → context7
    │
    ├─ テストを実行したい
    │   ├─ E2Eテスト → playwright-test
    │   └─ ブラウザ操作 → playwright
    │
    ├─ UIコンポーネントを追加したい → shadcn
    │
    └─ インフラを確認したい
        ├─ Vercel → vercel-awesome-ai
        └─ GCP → gcloud
```

---

## トラブルシューティング

### MCPサーバーが応答しない

1. **接続確認**: サーバーが起動しているか確認
2. **再起動**: Claude Codeを再起動
3. **設定確認**: `.mcp.json` の設定を確認

### serenaでシンボルが見つからない

1. **ripgrepで確認**: `Grep` でテキスト検索して存在確認
2. **パス指定**: `relative_path` で検索範囲を限定
3. **大文字小文字**: シンボル名は大文字小文字を区別

### playwrightでテストが失敗

1. **開発サーバー確認**: `pnpm dev` が起動しているか
2. **スナップショット取得**: `browser_snapshot` で状態確認
3. **デバッグ実行**: `test_debug` でステップ実行
