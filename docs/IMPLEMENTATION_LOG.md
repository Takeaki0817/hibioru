# 実装・テスト記録

## 概要

このドキュメントは、ヒビオルの主要機能の実装状況とテスト結果を記録したものです。

---

## 1. プッシュ通知機能

### 実装日
2025-12-18

### 実装内容

| コンポーネント | ファイル | 説明 |
|--------------|---------|------|
| Service Worker | `public/sw.js` | プッシュ通知の受信・表示・クリック処理 |
| SW登録 | `components/ServiceWorkerRegistration.tsx` | Service Workerの登録 |
| 通知設定UI | `features/notification/components/notification-settings.tsx` | 通知ON/OFF、リマインド時刻設定 |
| 購読API | `app/api/notifications/subscribe/route.ts` | Push購読の登録・解除 |
| 設定API | `app/api/notification/settings/route.ts` | 通知設定の取得・更新 |
| Edge Function | `supabase/functions/send-notification/` | 通知送信処理 |

### 環境変数

```env
# .env.local に設定が必要
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<公開鍵>
VAPID_PRIVATE_KEY=<秘密鍵>
```

### テスト結果

| テスト項目 | 結果 | 備考 |
|-----------|------|------|
| Service Worker登録 | ✅ 成功 | コンソールに `Service Worker registered` 表示 |
| Push購読登録 | ✅ 成功 | DBに購読情報が保存される |
| 通知受信 | ✅ 成功 | SW側でPushEventを受信 |
| 通知表示 | ✅ 成功 | macOS通知センターに表示 |

### 注意事項

- アイコンファイル（`/icon-192.png`, `/badge-72.png`）は未作成
- 現在はアイコンなしで通知表示
- PWA対応時にアイコン追加を推奨

---

## 2. ほつれ機能（ストリーク保護）

### 実装日
2025-12-17

### 実装内容

| コンポーネント | ファイル | 説明 |
|--------------|---------|------|
| ストリークサービス | `lib/streak/service.ts` | ストリーク計算・更新 |
| ほつれサービス | `lib/hotsure/service.ts` | ほつれ消費・リセット |
| 日次バッチ | `supabase/migrations/20251217060000_create_daily_streak_batch.sql` | 毎日0:00 JST実行 |
| 週次バッチ | `supabase/migrations/20251217040000_create_reset_hotsure_function.sql` | 毎週月曜0:00 JST実行 |
| cronジョブ | `supabase/migrations/20251217070000_schedule_cron_jobs.sql` | pg_cronでスケジュール |

### データベース設計

```sql
-- streaksテーブル
CREATE TABLE streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,      -- 現在の継続日数
  longest_streak INTEGER DEFAULT 0,      -- 最長継続日数
  last_entry_date DATE,                  -- 最終記録日
  hotsure_remaining INTEGER DEFAULT 2,   -- ほつれ残り回数
  hotsure_used_dates DATE[] DEFAULT '{}' -- ほつれ使用日
);
```

### テスト結果

| シナリオ | ほつれ残り | 結果 | 備考 |
|---------|----------|------|------|
| 記録なし + ほつれあり | 2→1 | ✅ ストリーク維持 | ほつれ自動消費 |
| 記録なし + ほつれあり | 1→0 | ✅ ストリーク維持 | ほつれ自動消費 |
| 記録なし + ほつれなし | 0 | ✅ ストリーク途切れ | current_streak=0にリセット |
| ストリーク途切れ後 | - | ✅ longest_streak維持 | 最長記録は保持 |

### テスト用スクリプト

```bash
# 状態確認
npx tsx scripts/check-streak.ts

# ほつれテスト
npx tsx scripts/test-hotsure.ts         # 使い方表示
npx tsx scripts/test-hotsure.ts setup   # テスト用セットアップ
npx tsx scripts/test-hotsure.ts batch   # 日次バッチ実行
npx tsx scripts/test-hotsure.ts reset   # 状態リセット
```

---

## 3. UI/UX改善

### 実装日
2025-12-18

### 実装内容

| 機能 | ファイル | 説明 |
|-----|---------|------|
| サービス紹介ページ | `app/page.tsx` | 未ログインユーザー向けランディング |
| フッターナビ | `components/layouts/footer-nav.tsx` | タイムライン/ソーシャル切り替え |
| 投稿FAB | `app/timeline/TimelineClient.tsx` | 右下の「+」ボタンで新規投稿 |

### ルーティング

| パス | 認証 | 説明 |
|-----|------|------|
| `/` | 不要 | サービス紹介（ログイン済みは`/timeline`へリダイレクト） |
| `/login` | 不要 | ログインページ |
| `/timeline` | 必要 | タイムライン |
| `/new` | 必要 | 新規投稿 |
| `/social` | 必要 | ソーシャル（プロフィール・設定・通知設定含む） |

---

## 4. Spec進捗状況

### 完了したSpec

| Spec | 状態 | 備考 |
|------|------|------|
| auth | ✅ 完了 | Google OAuth認証 |
| entry-input | ✅ 完了 | 記録の作成・編集・削除 |
| timeline | ✅ 完了 | タイムライン・カレンダー表示 |
| streak | ✅ 完了 | ストリーク計算・ほつれ機能 |
| social | ✅ 完了 | プロフィール・設定・エクスポート・ソーシャル機能 |
| notification | ✅ 完了 | プッシュ通知 |

### 確認コマンド

```bash
# 各Specの詳細状況
/kiro:spec-status auth
/kiro:spec-status entry-input
/kiro:spec-status timeline
/kiro:spec-status streak
/kiro:spec-status social
/kiro:spec-status notification
```

---

## 5. 開発用スクリプト一覧

| スクリプト | 用途 |
|-----------|------|
| `scripts/check-streak.ts` | ストリーク/ほつれ状態確認 |
| `scripts/test-hotsure.ts` | ほつれ機能テスト |
| `scripts/send-test-notification.ts` | テスト通知送信 |
| `scripts/generate-vapid-keys.ts` | VAPID鍵生成 |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-18 | プッシュ通知機能テスト完了、ほつれ機能テスト完了 |
| 2025-12-18 | UI改善（ルートページ、フッターナビ、FAB） |
| 2025-12-17 | ストリーク・ほつれ機能実装 |
