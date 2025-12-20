# Featuresベースアーキテクチャ

[bulletproof-react](https://github.com/alan2207/bulletproof-react) の設計思想を採用。

## 依存関係の方向

```
共有パーツ ← フィーチャー ← アプリケーション層
```

- **共有パーツ** (`components/`, `lib/`): 全体で使用可能
- **フィーチャー** (`features/`): 共有パーツのみから依存
- **アプリケーション層** (`app/`): フィーチャーと共有パーツの両方を使用

## クロスフィーチャーインポート禁止

機能間で直接インポートしない。

```typescript
// 禁止: feature → feature
import { useStreak } from '@/features/streak/hooks/use-streak'

// 許可: feature → lib/components（共有パーツ）
import { createClient } from '@/lib/supabase/server'
```

機能間の依存が必要な場合は、アプリケーション層（`app/`）で統合する。

## フィーチャー構造テンプレート

```
src/features/{feature}/
├── api/                     # ビジネスロジック、Server Actions
├── components/              # 機能固有コンポーネント
├── hooks/                   # 機能固有フック
├── stores/                  # Zustand ストア（Props Drilling解消用）
│   ├── {feature}-store.ts
│   └── __tests__/           # ストアのテスト
├── __tests__/               # テストファイル
└── types.ts                 # 型定義
```

## 新機能追加時

```bash
mkdir -p src/features/new-feature/{api,components,hooks,stores,__tests__}
```

## インポートパス規則

```typescript
// 機能内の相対インポート
import { SomeType } from '../types'
import { useHook } from '../hooks/use-hook'

// 他の機能・共有パーツからのインポート
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
```
