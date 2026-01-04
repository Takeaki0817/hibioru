# Skills 活用ガイド

プロジェクト固有のスキルが `.claude/skills/` に定義されています。

## 開発フロー系

### spec-full（新機能一括開発）

**用途**: 新機能を仕様策定→実装→テストまで8フェーズで自動実行

**コマンド**:
```
/spec-full
「ユーザープロフィール機能を作成して」
```

**8フェーズ**:
1. Spec初期化 → 2. 要件生成 → 3. 設計生成 → 4. タスク生成
5. Gap分析 → 6. TDD実装 → 7. E2Eテスト → 8. 実装検証

**オプション**:
- 「Gap分析はスキップ」「E2Eテストは不要」→ フェーズ省略
- 「対話モードで」「確認しながら」→ 各フェーズで確認
- 「並列で」「高速に」→ ワークツリー並列実行

**使用場面**: 新機能開発の開始時

---

### serena（LSPベースコード理解）

**用途**: シンボルレベルでのコード検索・リファクタリング

**MCPツールとして直接利用可能**:
```bash
# シンボル検索
mcp__serena__find_symbol --name_path_pattern "TimelineClient"

# 参照追跡
mcp__serena__find_referencing_symbols --name_path "useStreak" --relative_path "src/features/streak/hooks"

# シンボル単位の編集
mcp__serena__replace_symbol_body --name_path "MyClass/myMethod" --relative_path "..." --body "..."
mcp__serena__insert_after_symbol --name_path "MyClass" --relative_path "..." --body "..."
```

**ワークフローパターン**:

1. **安全なリファクタリング**:
   ```
   find_symbol → find_referencing_symbols → 影響分析 → 編集
   ```

2. **機能追加**:
   ```
   find_symbol → 衝突確認 → insert_after_symbol
   ```

3. **デッドコード検出**:
   ```
   find_symbol → find_referencing_symbols → 参照0件なら削除可能
   ```

**使用場面**: コード理解、大規模リファクタリング、影響分析

---

## テスト系

### javascript-testing-patterns

**用途**: Jest・Vitest・Testing Libraryでのテスト実装パターン

**対象**: ユニットテスト・統合テスト

**主なパターン**:
- AAA（Arrange-Act-Assert）パターン
- モック・スタブの使い分け
- 非同期テストのベストプラクティス
- TDD/BDDワークフロー

**使用場面**: ユニットテスト実装時に参照

---

### e2e-testing-patterns

**用途**: Playwright・CypressでのE2Eテスト実装パターン

**主なパターン**:
- Page Object Model
- フレーク対策
- データセットアップ
- CI/CD統合

**使用場面**: E2Eテスト実装時に参照

---

### webapp-testing

**用途**: Playwrightでのインタラクティブブラウザテスト

**コマンド**:
```
/webapp-testing
```

**使用場面**: UI動作確認、手動テストの自動化

---

### E2E関連コマンド

| コマンド | 用途 |
|----------|------|
| `/e2e:generate {feature}` | 仕様からE2Eテスト生成 |
| `/e2e:verify {feature}` | 機能単位の仕様検証 |
| `/e2e:verify-all` | 全機能一括検証 |
| `/e2e:fix` | テスト失敗時の実装修正 |
| `/e2e:report` | カバレッジレポート |
| `/e2e:complete` | 実装完了まで検証・修正 |

---

## UI・デザイン系

### frontend-design

**用途**: 高品質フロントエンドUI生成

**特徴**:
- 既存デザインシステム準拠（shadcn/ui）
- ジェネリックAI臭を避けたクリエイティブなデザイン
- アクセシビリティ考慮

**使用場面**: 新規画面・コンポーネント作成時

---

### accessibility-auditor

**用途**: WCAGコンプライアンス・アクセシビリティ監査

**内容**:
- WCAG 2.1 Level AA/AAA準拠の監査
- ARIA実装パターン
- キーボードナビゲーション
- スクリーンリーダー対応
- ADA/Section 508コンプライアンス

**主なチェック項目**:
- 画像のalt属性
- カラーコントラスト（4.5:1以上）
- セマンティックHTML
- フォームラベル
- キーボードアクセシビリティ
- ARIAランドマーク
- モーダル/ダイアログのフォーカス管理
- スキップリンク

**使用場面**: UI実装時のアクセシビリティ確認、監査対応

---

## その他

### rule-identifier

**用途**: Hookify規約ファイル作成

**内容**:
- `.claude/rules/` への規約追加
- globs設定パターン
- 規約ファイルのベストプラクティス

**使用場面**: 新規コーディング規約追加時

---

### security-requirement-extraction

**用途**: セキュリティ要件抽出

**内容**:
- 脅威モデルからの要件導出
- セキュリティユーザーストーリー作成
- テストケース生成

**使用場面**: セキュリティ設計時

---

## スキル選択フローチャート

```
何をしたいか？
    │
    ├─ 新機能を一から作りたい → /spec-full
    │
    ├─ コードを理解・リファクタリングしたい → serena (MCP)
    │
    ├─ テストを書きたい
    │   ├─ ユニットテスト → javascript-testing-patterns
    │   └─ E2Eテスト → e2e-testing-patterns, /e2e:generate
    │
    ├─ UIを作りたい
    │   ├─ デザイン・実装 → frontend-design
    │   └─ アクセシビリティ確認 → accessibility-auditor
    │
    └─ その他
        ├─ 規約追加 → rule-identifier
        └─ セキュリティ設計 → security-requirement-extraction
```
