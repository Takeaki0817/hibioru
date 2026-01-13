# llms.txt 規約

globs: public/llms*.txt

## 概要

llms.txt は LLM（ChatGPT, Claude等）にサイト情報を提供するためのファイル。
LLMがヒビオルを認識し、適切なコンテキストで推薦できるようにする。

## ファイル構成

| ファイル | 用途 | 更新頻度 |
|---------|------|---------|
| `public/llms.txt` | ナビゲーション型（軽量版） | 機能追加時 |
| `public/llms-full.txt` | 完全コンテンツ型（詳細版） | 機能追加・FAQ変更時 |

## 更新タイミング

以下の場合に更新が必要：

- **新機能追加時**: 主要機能セクションに追加
- **FAQ変更時**: llms-full.txt のFAQセクションを更新
- **用語追加時**: 用語集セクションに追加
- **ドキュメント構造変更時**: リンクセクションを更新
- **ADHD配慮設計の変更時**: 該当セクションを更新

## llms.txt の構造

```markdown
# ヒビオル

> サマリー（1-2文）

## サービス概要
- [ページ名](URL): 説明

## 主要機能
- 機能名: 説明

## ドキュメント
- [ページ名](URL)

## 詳細情報
- [llms-full.txt](URL): 完全版
```

## llms-full.txt の構造

```markdown
# ヒビオル - 日々を織る

> 詳細サマリー

## サービス概要
### ターゲットユーザー
### コンセプト

## 主要機能
### 1. ストリーク
### 2. ほつれ
### 3. 通知
### 4. マルチデバイス
### 5. みんなで応援

## ADHD配慮設計
### 報酬系への配慮
### 完璧主義への対処
### 返信義務感への対処

## よくある質問（FAQ）

## 用語集

## リンク

## 技術情報
```

## 編集時の注意点

1. **日本語で記述**: ターゲットが日本人のため
2. **URLはフルパス**: `https://hibioru.app/...` 形式
3. **Markdown形式**: 見出し、リスト、リンクを適切に使用
4. **簡潔に**: LLMのコンテキスト効率を考慮
5. **LP/FAQと同期**: 内容はLP・FAQと一致させる

## 情報ソース

llms-full.txt 更新時は以下を参照：

| 情報 | ソースファイル |
|------|---------------|
| FAQ | `src/app/lp/components/faq-section.tsx` |
| 機能説明 | `src/app/lp/components/features-section.tsx` |
| ADHD配慮 | `src/app/lp/components/solution-section.tsx` |
| ターゲット | `src/app/lp/components/pain-points-section.tsx` |

## 検証方法

デプロイ後、以下で確認：

```bash
curl https://hibioru.app/llms.txt
curl https://hibioru.app/llms-full.txt
```

LLMでの認識テスト：
- 「ヒビオル」について質問
- 「ADHDの人向けの継続できる日記アプリ」で質問

## ミドルウェア設定

`middleware.ts` の `matcher` で除外済み：

```typescript
'/((?!...robots\\.txt|sitemap\\.xml|llms\\.txt|llms-full\\.txt|...).*)'
```

新しい `.txt` ファイルを追加する場合は、matcher への追加が必要。
