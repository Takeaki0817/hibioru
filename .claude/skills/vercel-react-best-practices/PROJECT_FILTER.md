# プロジェクト固有の適用フィルター

## 概要

Vercel React Best Practices スキルから、このプロジェクト（hibioru）に適用すべきパターンと除外すべきパターンを定義します。
初〜中級者が保守可能な品質を維持する方針に基づき選定しています。

## 採用パターン

| カテゴリ | パターン | 備考 |
|---------|----------|------|
| async | async-parallel | Promise.all（既に使用中） |
| async | async-defer-await | awaitの遅延で並列化 |
| async | async-suspense-boundaries | Suspense境界の適切な配置 |
| bundle | bundle-* 全般 | 動的インポート、コード分割 |
| client | client-swr-dedup | TanStack Queryで代替済み |
| rerender | rerender-* 全般 | useMemo, useCallback, memo |
| rendering | rendering-* 全般 | Activity除く |
| js | js-* 全般 | Set/Map lookups, RegExp hoisting |

## 除外パターン

| カテゴリ | パターン | 除外理由 |
|---------|----------|----------|
| async | async-dependencies | better-allライブラリは不要（ネイティブPromise.allで十分） |
| advanced | advanced-* 全般 | 複雑すぎる、保守性低下 |
| server | server-cache-lru | TanStack Queryで代替 |
| rendering | rendering-activity | React 19実験的機能 |

## 選定理由

1. **シンプルさ優先**: 外部ライブラリ依存や実験的機能は採用しない
2. **保守性**: 初〜中級者が理解・保守できるコードを維持
3. **既存パターン尊重**: TanStack Query、Zustandなど既存の状態管理を活用

## 参照

- Zenn記事の批評: advanced/serverカテゴリは初〜中級者には難易度が高い
- better-allライブラリ: ネイティブPromise.allで同等の結果が得られる
