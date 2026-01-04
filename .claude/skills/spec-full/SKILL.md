---
name: spec-full
description: 新機能を定義からテスト完了まで8フェーズで自律実行。「新機能を作成して」「フル仕様を生成して」「機能開発を最初から最後まで」「この機能を完全に実装して」などのリクエスト時に使用。要件生成→設計→タスク→Gap分析→TDD実装→E2Eテスト→検証を一括実行。
allowed-tools: Read, Bash, Write, Glob, Skill
---

# Full Spec Workflow

新機能を定義からテスト完了まで8フェーズで自律的に実行するスキル。

## Mission

ユーザーが新機能の開発を依頼した際に、仕様策定から実装・テスト・検証までを一気通貫で自動実行する。

## Instructions

### Step 1: リクエスト解析

ユーザーのリクエストから以下を解析:

1. **機能説明**: 何を作るか（例: 「ユーザープロフィール機能」「通知設定画面」）
2. **オプション**:
   - 「Gap分析はスキップ」「Gapは不要」→ Phase 5スキップ
   - 「E2Eテストはスキップ」「E2Eは不要」→ Phase 7スキップ
   - 「対話モードで」「確認しながら」→ 各フェーズでユーザー確認
   - 「並列で」「高速に」→ Phase 6をワークツリーで並列実行

### Step 2: 8フェーズ実行

各フェーズを順次実行し、進捗を報告する。

---

#### Phase 1: Spec初期化

**目的**: 新機能の仕様ディレクトリを作成

**手順**:
1. 機能説明をkebab-caseに変換（例: 「ユーザープロフィール」→ `user-profile`）
2. Glob で `.kiro/specs/*/` を確認し、名前衝突時は `-2`, `-3` を付与
3. `mkdir -p .kiro/specs/{feature-name}` でディレクトリ作成
4. テンプレートからファイル生成:
   - `.kiro/settings/templates/specs/init.json` → `spec.json`
   - `.kiro/settings/templates/specs/requirements-init.md` → `requirements.md`
5. プレースホルダー置換:
   - `{{FEATURE_NAME}}` → feature-name
   - `{{TIMESTAMP}}` → ISO 8601タイムスタンプ
   - `{{PROJECT_DESCRIPTION}}` → 機能説明

**出力**: `✅ Phase 1: Spec初期化完了 → .kiro/specs/{feature-name}/`

---

#### Phase 2: 要件生成

**実行**: `Skill("kiro:spec-requirements", "{feature-name}")`

「次のステップ」メッセージは無視して継続。

**出力**: `✅ Phase 2: 要件生成完了 → 設計生成へ...`

---

#### Phase 3: 設計生成

**実行**: `Skill("kiro:spec-design", "{feature-name} -y")`

`-y` フラグで要件を自動承認。

**出力**: `✅ Phase 3: 設計生成完了 → タスク生成へ...`

---

#### Phase 4: タスク生成

**実行**: `Skill("kiro:spec-tasks", "{feature-name} -y")`

`-y` フラグで設計を自動承認。

**出力**: `✅ Phase 4: タスク生成完了 → Gap分析へ...`

---

#### Phase 5: Gap分析（オプション）

**スキップ条件**: ユーザーが「Gap分析不要」と指定した場合

**スキップ時**: `⏭️ Phase 5: Gap分析スキップ`

**通常実行**: `Skill("kiro:validate-gap", "{feature-name}")`

**結果処理**:
- GO: Phase 6へ
- WARNING: 警告を表示してPhase 6へ
- NO-GO: ユーザー確認後に継続

**出力**: `✅ Phase 5: Gap分析完了 → TDD実装へ...`

---

#### Phase 6: TDD実装

**並列実行条件**: ユーザーが「並列で」と指定した場合

**通常実行**: `Skill("kiro:spec-impl", "{feature-name}")`

**並列実行**:
1. `.kiro/specs/{feature-name}/tasks.md` を読み込み
2. 独立したタスクグループを識別
3. 各グループ用にワークツリー作成:
   ```bash
   git worktree add ../hibioru-worktrees/{feature-name}-task-{n} -b task/{feature-name}-{n}
   ```
4. 各ワークツリーで並列実行:
   ```bash
   cd ../hibioru-worktrees/{feature-name}-task-{n}
   claude --print "/kiro:spec-impl {feature-name} {task-numbers}" &
   ```
5. 全完了後マージ:
   ```bash
   git checkout main
   git merge task/{feature-name}-{n} --no-ff
   ```
6. クリーンアップ

**出力**: `✅ Phase 6: TDD実装完了 → E2Eテストへ...`

---

#### Phase 7: E2Eテスト（オプション）

**スキップ条件**: ユーザーが「E2Eテスト不要」と指定した場合

**スキップ時**: `⏭️ Phase 7: E2Eテストスキップ`

**通常実行**: `Skill("e2e:generate", "{feature-name}")`

**失敗時**: `Skill("e2e:fix", "{feature-name}")` を最大3回

**出力**: `✅ Phase 7: E2Eテスト完了 → 実装検証へ...`

---

#### Phase 8: 実装検証

**実行**: `Skill("kiro:validate-impl", "{feature-name}")`

**出力**: `✅ Phase 8: 実装検証完了`

---

### Step 3: 最終レポート

全フェーズ完了後、以下の形式でレポートを出力:

```markdown
## 🎉 spec-full 完了レポート

### 機能: {feature-name}

### 生成ファイル
- .kiro/specs/{feature}/spec.json
- .kiro/specs/{feature}/requirements.md（X件の要件）
- .kiro/specs/{feature}/design.md（Y件のコンポーネント）
- .kiro/specs/{feature}/tasks.md（Z件のタスク）

### 実装結果
- 完了タスク: Z/Z
- テストファイル: src/features/{feature}/__tests__/*.test.ts

### E2Eテスト結果
- 生成テスト: e2e/{feature}.spec.ts（N件）
- 成功: N件 / 失敗: 0件
（スキップ時は「スキップ済み」）

### 検証結果
- ステータス: ✅ GO / ⚠️ WARNING

### 次のステップ
1. 生成コードの手動レビュー
2. PRの作成: `/git:create-pr`
```

## Important Constraints

### 自動モード動作（デフォルト）
- フェーズ間で停止しない
- ユーザー入力を待たない
- 「次のステップ」メッセージを無視
- 全フェーズ完了まで継続

### 対話モード動作
- 各フェーズ後にユーザー確認
- 「yes/y」で続行、「no/n」で停止

### ビジュアルデザイン方針
Phase 6（TDD実装）で生成するUIコンポーネントは:
1. 既存デザインシステム準拠（`src/components/ui/` のshadcn/ui）
2. 最低限の実装（機能的に必要なUIのみ）
3. 後から調整（過度なスタイリングは避ける）
4. 一貫性重視（既存画面と同じパターン）

### エラーハンドリング
- フェーズ失敗時は停止
- エラー内容を表示
- 手動再開コマンドを提示

## Examples

### 例1: 基本的な新機能作成

**ユーザー**: 「新機能としてユーザープロフィール機能を作成して」

**処理**:
1. 機能説明: 「ユーザープロフィール機能」
2. オプション: なし（全フェーズ実行）
3. 8フェーズを順次自動実行

### 例2: E2Eスキップ

**ユーザー**: 「通知設定画面を作成して。E2Eテストは後で」

**処理**:
1. 機能説明: 「通知設定画面」
2. オプション: E2Eスキップ
3. Phase 1-6, Phase 8を実行（Phase 7スキップ）

### 例3: 対話モード

**ユーザー**: 「設定画面を作成して。各フェーズで確認しながら進めて」

**処理**:
1. 機能説明: 「設定画面」
2. オプション: 対話モード
3. 各フェーズ後に「続行しますか？」と確認

### 例4: 並列実行

**ユーザー**: 「ダッシュボード機能を並列で高速に作成して」

**処理**:
1. 機能説明: 「ダッシュボード機能」
2. オプション: 並列実行
3. Phase 6でGitワークツリーを使用して並列実装

## When NOT to Use

以下の場合は個別コマンドを使用:
- 複雑なシステム統合（手動でのGap分析が必要）
- セキュリティ重要な機能（各フェーズで詳細レビューが必要）
- 既存仕様の修正（spec-fullは新規作成専用）
