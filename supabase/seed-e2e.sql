-- E2Eテスト用シードデータ
-- タイムライン統合テスト用のテストデータを作成

-- テスト用ユーザー（E2Eテスト専用）
-- 注意: このユーザーIDはe2e/fixtures/test-helpers.tsのTEST_USER.idと一致させる
-- auth.usersテーブルに直接挿入（ローカル開発環境用）

-- 既存のテストユーザーを削除（冪等性確保）
DELETE FROM auth.users WHERE id = 'test-user-id-e2e-12345';

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
  'test-user-id-e2e-12345',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'e2e-test@example.com',
  crypt('e2e-test-password', gen_salt('bf')),
  NOW(),
  '{"provider": "google", "providers": ["google"]}',
  '{"full_name": "E2Eテストユーザー", "avatar_url": null}',
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
  'test-user-id-e2e-12345',
  'e2e-test@example.com',
  'E2Eテストユーザー',
  NULL,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name;

-- ストリーク情報を初期化
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  'test-user-id-e2e-12345',
  3,
  10,
  CURRENT_DATE - INTERVAL '1 day',
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
INSERT INTO notification_settings (user_id, enabled, main_reminder_time, chase_reminder_enabled, chase_reminder_delay_minutes)
VALUES (
  'test-user-id-e2e-12345',
  TRUE,
  '21:00',
  TRUE,
  60
)
ON CONFLICT (user_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  main_reminder_time = EXCLUDED.main_reminder_time;

-- テスト用エントリ（タイムラインテスト用）
-- 既存のテスト用エントリを削除
DELETE FROM entries WHERE user_id = 'test-user-id-e2e-12345';

-- 今日のエントリ（複数件）
INSERT INTO entries (id, user_id, content, image_url, is_public, is_deleted, created_at, updated_at)
VALUES
  -- 今日の投稿
  (
    'entry-today-1',
    'test-user-id-e2e-12345',
    '今日も頑張った！',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'entry-today-2',
    'test-user-id-e2e-12345',
    '朝ごはん食べた',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  -- 昨日の投稿
  (
    'entry-yesterday-1',
    'test-user-id-e2e-12345',
    '昨日のテスト記録',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '1 day' - INTERVAL '2 hours',
    NOW() - INTERVAL '1 day' - INTERVAL '2 hours'
  ),
  -- 3日前の投稿
  (
    'entry-3days-ago',
    'test-user-id-e2e-12345',
    '3日前の記録です',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  -- 1週間前の投稿
  (
    'entry-1week-ago',
    'test-user-id-e2e-12345',
    '1週間前の記録',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
  ),
  -- 編集可能なエントリ（24時間以内）
  (
    'editable-entry-id',
    'test-user-id-e2e-12345',
    '編集可能なエントリ',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  -- 編集不可なエントリ（24時間以上前）
  (
    'old-entry-id-24h-plus',
    'test-user-id-e2e-12345',
    '24時間以上前のエントリ',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '25 hours',
    NOW() - INTERVAL '25 hours'
  );

-- 無限スクロールテスト用の大量データ（50件）
INSERT INTO entries (user_id, content, image_url, is_public, is_deleted, created_at, updated_at)
SELECT
  'test-user-id-e2e-12345',
  'テスト投稿 #' || generate_series,
  NULL,
  FALSE,
  FALSE,
  NOW() - (generate_series * INTERVAL '6 hours'),
  NOW() - (generate_series * INTERVAL '6 hours')
FROM generate_series(1, 50);

-- ほつれ使用日の追加（過去にほつれを使用した日）
UPDATE streaks
SET hotsure_used_dates = ARRAY[
  (CURRENT_DATE - INTERVAL '5 days')::DATE,
  (CURRENT_DATE - INTERVAL '12 days')::DATE
]
WHERE user_id = 'test-user-id-e2e-12345';

-- 確認用: 作成されたデータの件数を表示
-- SELECT 'テストユーザー: ' || COUNT(*) FROM users WHERE id = 'test-user-id-e2e-12345';
-- SELECT 'テストエントリ: ' || COUNT(*) FROM entries WHERE user_id = 'test-user-id-e2e-12345';
