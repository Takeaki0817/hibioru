-- ヒビオル開発用シードデータ
-- 月またぎのテスト用に先月25日から今日までのデータを作成

-- テスト用ユーザー
-- 注意: このユーザーIDは開発用テストに使用
-- auth.usersテーブルに直接挿入（ローカル開発環境用）

-- 既存のテストユーザーを削除（冪等性確保）
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- テストユーザーをauth.usersに追加
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dev@example.com',
  crypt('dev-password', gen_salt('bf')),
  NOW(),
  '{"provider": "google", "providers": ["google"]}',
  '{"full_name": "開発テストユーザー", "avatar_url": null}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- usersテーブルにテストユーザーを追加
INSERT INTO users (id, email, display_name, avatar_url, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@example.com',
  '開発テストユーザー',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name;

-- ストリーク情報を初期化
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  10,
  25,
  CURRENT_DATE,
  2,
  ARRAY[]::DATE[]
)
ON CONFLICT (user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  last_entry_date = EXCLUDED.last_entry_date,
  hotsure_remaining = EXCLUDED.hotsure_remaining,
  hotsure_used_dates = EXCLUDED.hotsure_used_dates;

-- 通知設定を初期化
INSERT INTO notification_settings (user_id, enabled, chase_reminder_enabled, chase_reminder_delay_minutes, reminders)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  TRUE,
  TRUE,
  60,
  '[{"time": "21:00", "enabled": true}, {"time": null, "enabled": false}, {"time": null, "enabled": false}, {"time": null, "enabled": false}, {"time": null, "enabled": false}]'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  reminders = EXCLUDED.reminders;

-- 既存のテスト用エントリを削除
DELETE FROM entries WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- ================================================
-- 月またぎテスト用データ
-- 先月25日から今日までのエントリを作成
-- 一部の日はスキップ（エントリなし）にしてスキップロジックのテスト
-- ================================================

-- 絵文字リスト（ランダムに選択）
-- 実際のデータに近いバリエーション

-- 11月25日（月）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '☕ 朝のコーヒー',
  (DATE '2024-11-25' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-25' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 11月26日（火）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '🏃 ランニング30分',
  (DATE '2024-11-26' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-26' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '📖 読書した',
  (DATE '2024-11-26' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-26' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 11月27日（水）スキップ（エントリなし）→スキップロジックテスト用

-- 11月28日（木）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🍎 りんご食べた',
  (DATE '2024-11-28' + TIME '15:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-28' + TIME '15:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 11月29日（金）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '💪 筋トレ完了',
  (DATE '2024-11-29' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-29' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '🎮 ゲームした',
  (DATE '2024-11-29' + TIME '21:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-29' + TIME '21:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 11月30日（土）← 月末日（重要！）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '🌙 11月最後の日',
  (DATE '2024-11-30' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-30' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '🛒 買い物行った',
  (DATE '2024-11-30' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-30' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '🍜 ラーメン食べた',
  (DATE '2024-11-30' + TIME '23:45:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-11-30' + TIME '23:45:00') AT TIME ZONE 'Asia/Tokyo'
);

-- ================================================
-- 12月（月またぎ後）
-- ================================================

-- 12月1日（日）← 月初日（重要！）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '🎄 12月スタート！',
  (DATE '2024-12-01' + TIME '00:15:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-01' + TIME '00:15:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '☕ モーニング',
  (DATE '2024-12-01' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-01' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月2日（月）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '💼 仕事頑張った',
  (DATE '2024-12-02' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-02' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月3日（火）スキップ

-- 12月4日（水）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🎵 音楽聴いた',
  (DATE '2024-12-04' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-04' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月5日（木）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🍕 ピザ食べた',
  (DATE '2024-12-05' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-05' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月6日（金）スキップ

-- 12月7日（土）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '🎬 映画観た',
  (DATE '2024-12-07' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-07' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '🍿 ポップコーン最高',
  (DATE '2024-12-07' + TIME '16:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-07' + TIME '16:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月8日（日）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🛋️ ゆっくり休んだ',
  (DATE '2024-12-08' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-08' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月9日（月）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '📝 タスク整理した',
  (DATE '2024-12-09' + TIME '09:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-09' + TIME '09:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月10日（火）スキップ

-- 12月11日（水）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🏃 ジョギングした',
  (DATE '2024-12-11' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-11' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月12日（木）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '🍵 抹茶飲んだ',
  (DATE '2024-12-12' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-12' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '📚 勉強した',
  (DATE '2024-12-12' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-12' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月13日（金）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🎉 週末だ！',
  (DATE '2024-12-13' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-13' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月14日（土）スキップ

-- 12月15日（日）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🛏️ たっぷり寝た',
  (DATE '2024-12-15' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-15' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月16日（月）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '💻 コード書いた',
  (DATE '2024-12-16' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-16' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月17日（火）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '🌅 早起きした',
  (DATE '2024-12-17' + TIME '05:30:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-17' + TIME '05:30:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '🥗 サラダ食べた',
  (DATE '2024-12-17' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-17' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月18日（水）
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🎯 目標達成！',
  (DATE '2024-12-18' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-18' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- 12月19日（木）← 今日
INSERT INTO entries (user_id, content, created_at, updated_at)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '☀️ いい天気',
  (DATE '2024-12-19' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-19' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'
),
(
  '00000000-0000-0000-0000-000000000001',
  '🔥 今日も頑張る',
  (DATE '2024-12-19' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo',
  (DATE '2024-12-19' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'
);

-- ================================================
-- ほつれ使用日（スキップした日）
-- ================================================
UPDATE streaks
SET hotsure_used_dates = ARRAY[
  DATE '2024-11-27',
  DATE '2024-12-03'
]
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 確認用クエリ（コメントアウト）
-- SELECT '作成されたユーザー: ' || COUNT(*) FROM users WHERE id = '00000000-0000-0000-0000-000000000001';
-- SELECT '作成されたエントリ: ' || COUNT(*) FROM entries WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- SELECT date, COUNT(*) as count FROM (
--   SELECT DATE(created_at AT TIME ZONE 'Asia/Tokyo') as date
--   FROM entries
--   WHERE user_id = '00000000-0000-0000-0000-000000000001'
-- ) t GROUP BY date ORDER BY date;
