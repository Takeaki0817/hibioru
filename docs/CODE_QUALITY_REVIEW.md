# コード品質レビュー

## 目的

現在のコード品質に関するレビュー結果を記録し、改善の優先順位づけと追跡を容易にする。

---

## レビュー概要

- 対象: `src/` 配下の代表的な TS/TSX 実装と設定ファイル
- 観点: 正確性、型安全性、運用性（ログ）、長期保守性

---

## 重要な指摘

### 高: 日付境界の取り扱いがJST前提とズレる可能性

`TimelinePage` で「今日」の範囲を `Date` のローカル時刻で計算しており、JST前提の設計（`getJSTDayBounds` など）と一致しない可能性がある。サーバーがUTCの環境では、最大9時間分の取得漏れ・混入が起こりうる。

- 該当: `src/app/timeline/page.tsx`
- 影響: 今日のエントリ取得が不正確になる

### 中: タイムゾーン変換の一貫性不足（エクスポートとクライアント初期日付）

JST前提の設計がある一方で、エクスポートAPIやクライアント側の初期日付処理がUTC/ローカル依存となっている。日付指定エクスポートや初期日付スクロールが、JST基準の期待とズレる可能性がある。

- 該当: `src/app/api/export/route.ts`, `src/app/timeline/TimelineClient.tsx`
- 影響: 日付指定のエクスポート結果や初期表示が1日ズレる可能性

### 中: `supabase as any` の多用で型安全性が無効化

`Database` 型が存在するにもかかわらず `as any` による回避が多く、スキーマ変更や列名ミスがビルド時に検出されない。特に通知・エントリ・ストリーク周辺で散在。

- 例: `src/features/notification/api/followup.ts`
- 影響: ランタイムでの不正クエリが見逃されやすい

### 中: エントリ更新時の所有者チェックが欠落（防御的設計不足）

削除処理では所有者チェックがある一方で、更新処理はエントリIDのみで更新しており、明示的な `user_id` チェックがない。RLS前提とはいえ、RLSの設定ミス時に不正更新が起きうる。

- 該当: `src/features/entry/api/actions.ts`
- 影響: RLS誤設定時の不正更新リスクが高まる

### 中: `console.*` の直接使用が複数箇所に残存

ロギング方針として `logger` が用意されている一方、Server Componentや共通ロジックで `console.error` などが残っている。運用ログの統制やPII露出管理が難しくなる可能性がある。

- 例: `src/app/timeline/page.tsx`, `src/lib/supabase/cached-queries.ts`
- 影響: 本番でのログポリシー違反・情報露出

### 中: Stripe Webhookの冪等性がコード上は不明瞭

`payment_intent.succeeded` の処理で購入レコード作成とボーナス加算が行われるが、Webhook再送に対する二重処理の防止がコード上では確認できない。ユニーク制約がなければ二重付与の可能性がある。

- 該当: `src/app/api/webhooks/stripe/route.ts`
- 影響: 通信障害時の再送でボーナスが重複付与される可能性

### 低: `setInterval` のクリーンアップがない

`ServiceWorkerRegistration` にて `setInterval` が登録されるが、アンマウント時に `clearInterval` が行われない。HMRや再マウント時に不要な更新チェックが増える可能性がある。

- 該当: `src/components/ServiceWorkerRegistration.tsx`
- 影響: 小さなリーク／不要な実行

---

## 改善提案（優先順）

1. `TimelinePage` の日付境界を `getJSTDayBounds` に統一
2. エクスポートAPIとクライアント初期日付処理のJST統一
3. エントリ更新時に `user_id` を条件に含める
4. `supabase` の型生成と利用を見直し `as any` を削除
5. `console.*` を `logger` 経由に統一
6. `setInterval` のクリーンアップ追加

---

## 追跡メモ

- `notification_settings` などの型が `database.generated` に反映されていない可能性があるため、型生成フローの確認が必要。
- JST基準の境界はプロダクト要件に従い固定で良い前提。

