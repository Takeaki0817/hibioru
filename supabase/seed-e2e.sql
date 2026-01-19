-- E2Eテスト用シードデータ
-- タイムライン統合テスト用のテストデータを作成

-- テスト用ユーザー（E2Eテスト専用）
-- 注意: このユーザーIDはe2e/fixtures/test-helpers.tsのTEST_USERSと一致させる
-- auth.usersテーブルに直接挿入（ローカル開発環境用）

-- 既存のテストユーザーを削除（冪等性確保）
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002';

-- テストユーザー1（PRIMARY）をauth.usersに追加
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

-- テストユーザー2（SECONDARY）をauth.usersに追加
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
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'e2e-test2@example.com',
  crypt('e2e-test-password', gen_salt('bf')),
  NOW(),
  '{"provider": "google", "providers": ["google"]}',
  '{"full_name": "E2Eテストユーザー2", "avatar_url": null}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- usersテーブルにテストユーザー1（PRIMARY）を追加
INSERT INTO users (id, email, display_name, avatar_url, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'e2e-test@example.com',
  'E2Eテストユーザー',
  NULL,
  'e2etest',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username;

-- usersテーブルにテストユーザー2（SECONDARY）を追加
INSERT INTO users (id, email, display_name, avatar_url, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'e2e-test2@example.com',
  'E2Eテストユーザー2',
  NULL,
  'e2etest2',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username;

-- ストリーク情報を初期化
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  '00000000-0000-0000-0000-000000000001',
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

-- テスト用エントリ（タイムラインテスト用）
-- 既存のテスト用エントリを削除
DELETE FROM entries WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 今日のエントリ（複数件）
-- IDはgen_random_uuid()で自動生成
INSERT INTO entries (user_id, content, image_urls, is_public, is_deleted, created_at, updated_at)
VALUES
  -- 今日の投稿
  (
    '00000000-0000-0000-0000-000000000001',
    '今日も頑張った！',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '朝ごはん食べた',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  -- 昨日の投稿
  (
    '00000000-0000-0000-0000-000000000001',
    '昨日のテスト記録',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '1 day' - INTERVAL '2 hours',
    NOW() - INTERVAL '1 day' - INTERVAL '2 hours'
  ),
  -- 3日前の投稿
  (
    '00000000-0000-0000-0000-000000000001',
    '3日前の記録です',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  -- 1週間前の投稿
  (
    '00000000-0000-0000-0000-000000000001',
    '1週間前の記録',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
  ),
  -- 編集可能なエントリ（24時間以内）
  (
    '00000000-0000-0000-0000-000000000001',
    '編集可能なエントリ',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  -- 編集不可なエントリ（24時間以上前）
  (
    '00000000-0000-0000-0000-000000000001',
    '24時間以上前のエントリ',
    NULL,
    FALSE,
    FALSE,
    NOW() - INTERVAL '25 hours',
    NOW() - INTERVAL '25 hours'
  );

-- 無限スクロールテスト用の大量データ（50件）
INSERT INTO entries (user_id, content, image_urls, is_public, is_deleted, created_at, updated_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
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
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- ========================================
-- ソーシャル機能テスト用データ
-- ========================================

-- SECONDARYユーザーのストリーク情報を初期化
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  5,
  15,
  CURRENT_DATE - INTERVAL '1 day',
  2,
  ARRAY[]::DATE[]
)
ON CONFLICT (user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  last_entry_date = EXCLUDED.last_entry_date;

-- SECONDARYユーザーの投稿を削除（空状態テスト用）
DELETE FROM entries WHERE user_id = '00000000-0000-0000-0000-000000000002';

-- フォロー関係を作成（PRIMARY → SECONDARY）
-- 既存のフォロー関係を削除（冪等性確保）
DELETE FROM follows WHERE follower_id = '00000000-0000-0000-0000-000000000001' AND following_id = '00000000-0000-0000-0000-000000000002';
DELETE FROM follows WHERE follower_id = '00000000-0000-0000-0000-000000000002' AND following_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO follows (follower_id, following_id, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  NOW() - INTERVAL '1 hour'
);

-- SECONDARYユーザーの達成を作成（フィードに表示される）
-- 既存の達成を削除（冪等性確保）
DELETE FROM achievements WHERE user_id = '00000000-0000-0000-0000-000000000002';

INSERT INTO achievements (user_id, type, threshold, value, entry_id, is_shared, created_at)
VALUES
  -- 10投稿達成
  (
    '00000000-0000-0000-0000-000000000002',
    'total_posts',
    10,
    10,
    NULL,
    FALSE,
    NOW() - INTERVAL '30 minutes'
  ),
  -- 5日連続達成
  (
    '00000000-0000-0000-0000-000000000002',
    'streak_days',
    5,
    5,
    NULL,
    FALSE,
    NOW() - INTERVAL '1 hour'
  );

-- ソーシャル通知を作成（PRIMARYユーザーがSECONDARYからフォローされた通知）
-- 既存の通知を削除（冪等性確保）
DELETE FROM social_notifications WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM social_notifications WHERE user_id = '00000000-0000-0000-0000-000000000002';

-- SECONDARYがPRIMARYをフォローした通知（PRIMARYが受け取る）
INSERT INTO social_notifications (user_id, type, from_user_id, achievement_id, is_read, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'follow',
  '00000000-0000-0000-0000-000000000002',
  NULL,
  FALSE,
  NOW() - INTERVAL '2 hours'
);

-- ========================================
-- Social検索テスト用ユーザー
-- ========================================

-- 既存の検索テスト用ユーザーを削除（冪等性確保）
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000099';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000098';

-- Social検索テスト用ユーザー1（test_user）をauth.usersに追加
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
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test_user@example.com',
  crypt('e2e-test-password', gen_salt('bf')),
  NOW(),
  '{"provider": "google", "providers": ["google"]}',
  '{"full_name": "テストユーザー", "avatar_url": null}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Social検索テスト用ユーザー2（user_abc）をauth.usersに追加
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
  '00000000-0000-0000-0000-000000000098',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'user_abc@example.com',
  crypt('e2e-test-password', gen_salt('bf')),
  NOW(),
  '{"provider": "google", "providers": ["google"]}',
  '{"full_name": "ABCユーザー", "avatar_url": null}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- usersテーブルにSocial検索テスト用ユーザー1（test_user）を追加
INSERT INTO users (id, email, display_name, avatar_url, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'test_user@example.com',
  'テストユーザー',
  NULL,
  'test_user',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username;

-- usersテーブルにSocial検索テスト用ユーザー2（user_abc）を追加
INSERT INTO users (id, email, display_name, avatar_url, username, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000098',
  'user_abc@example.com',
  'ABCユーザー',
  NULL,
  'user_abc',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username;

-- 確認用: 作成されたデータの件数を表示
-- SELECT 'テストユーザー: ' || COUNT(*) FROM users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
-- SELECT 'テストエントリ: ' || COUNT(*) FROM entries WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
-- SELECT 'フォロー関係: ' || COUNT(*) FROM follows;
-- SELECT '達成: ' || COUNT(*) FROM achievements;
-- SELECT '通知: ' || COUNT(*) FROM social_notifications;
