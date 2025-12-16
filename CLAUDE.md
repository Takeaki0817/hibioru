# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project: ヒビオル (hibioru)

**コンセプト**: 「日々を織る」 - ADHD当事者のための瞬間記録アプリ
**技術スタック**: Next.js App Router + Supabase + Vercel
**開発フェーズ**: Phase 1 MVP（自分用）

### 実装状態

**現在**: 仕様策定完了、実装未着手
**ブランチ**: `claude/check-project-status-4YEFk`

| 機能 | 要件 | 設計 | タスク | 実装 |
|------|------|------|--------|------|
| auth (認証) | ✅ | ✅ | 📋 生成済 | ⏸️ |
| entry-input (入力) | ✅ | ✅ | 📋 生成済 | ⏸️ |
| timeline (タイムライン) | ✅ | ✅ | 📋 生成済 | ⏸️ |
| streak (継続記録) | ✅ | ✅ | 📋 生成済 | ⏸️ |
| mypage (マイページ) | ✅ | ✅ | 📋 生成済 | ⏸️ |
| notification (通知) | ✅ | ✅ | 📋 生成済 | ⏸️ |

**推奨実装順序**: `auth` → `entry-input` → `timeline` → `streak` → `mypage` → `notification`

### 次のアクション

```bash
# タスク確認（任意の機能）
/kiro:spec-status auth

# 実装開始（タスク承認後）
/kiro:spec-impl auth

# または複数タスクを指定
/kiro:spec-impl auth 1,2,3
```

---

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Docs: `docs/PROJECT.md`, `docs/REQUIREMENTS.md`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
- `product.md`: プロダクト概要、コア機能、価値提案
- `tech.md`: 技術スタック、開発標準、API設計
- `structure.md`: ディレクトリ構造、命名規則、コード構成

**Specs** (`.kiro/specs/`) - Formalize development process for individual features
- 各機能ごとに `requirements.md`, `design.md`, `tasks.md`, `spec.json`

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)
