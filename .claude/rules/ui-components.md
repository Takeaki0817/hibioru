---
globs: src/components/**/*.tsx
---

# UIコンポーネント規約

## shadcn/ui

配置: `src/components/ui/`

```bash
# 新規コンポーネント追加
npx shadcn@latest add button
npx shadcn@latest add dialog
```

## カスタムコンポーネント

framer-motion統合版:
- `motion-button.tsx` - アニメーション付きボタン
- `motion-card.tsx` - アニメーション付きカード

## アイコン

Lucide Iconsを使用（`lucide-react`）

```typescript
import { Calendar, Plus, Settings } from 'lucide-react'
```

## デザイン原則（ADHD向け）

### 視覚的に軽く
- Sage Green基調のカラーパレット
- 余白を十分に確保
- 情報密度を下げる

### 情報を絞る
- 一画面に表示する要素を最小限に
- 優先度の低い情報は折りたたむ
- モーダルよりインライン表示

### フィードバックは控えめ
- 派手なアニメーションより微細な動き
- 成功時の視覚フィードバックは短く
- エラーは穏やかに表示

### ポジティブな表現
- 失敗を責めない文言
- 行動を促すCTA
- 達成感を演出（ストリーク表示等）

## タイポグラフィ（優しいアプリの雰囲気）

### フォント
- **M PLUS Rounded 1c** - 丸みのある優しい印象
- ウェイト: Medium (500) / Bold (700) のみ

### サイズ階層

| クラス | サイズ | 用途 |
|--------|--------|------|
| `text-xs` | 12px | 注釈、タイムスタンプ（最小） |
| `text-sm` | 14px | 補助テキスト |
| `text-base` | 16px | 本文（ベース） |
| `text-lg` | 18px | 強調テキスト |
| `text-xl` | 20px | 小見出し |
| `text-2xl` | 24px | 見出し |
| `text-3xl` | 30px | 大見出し |

### ルール
- 最小フォントサイズは **12px**（これより小さくしない）
- 本文は `font-medium`（500）、見出しは `font-bold`（700）
- 行の高さは本文 1.8、見出し 1.3〜1.5
- 文字間は本文 0.02em、見出し 0.03em

## スタイリング

Tailwind CSS v4を使用。

```tsx
// 良い例: Tailwindクラスを直接使用
<button className="bg-sage-500 hover:bg-sage-600 px-4 py-2 rounded-lg">
  記録する
</button>

// 避ける例: インラインスタイル
<button style={{ backgroundColor: '#...' }}>
```
