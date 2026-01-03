---
paths: src/components/**/*.tsx
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
