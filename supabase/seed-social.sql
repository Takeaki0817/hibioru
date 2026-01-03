-- ソーシャル機能検証用シードデータ
-- 3ユーザーの投稿データを作成し、達成閾値のバリエーションを検証可能にする
-- 実行: docker exec -i supabase_db_hibioru psql -U postgres < supabase/seed-social.sql

-- ユーザーID定義
DO $$
DECLARE
  user_stakeaki UUID := '59499823-a82e-4503-933c-8593ac1dec1d';
  user_rimorimo UUID := '0ed83e5c-8fee-4207-95e5-126d446c6de6';
  user_takeakishimatsu UUID := '1767fbeb-e86a-4308-888d-fa3971b2b016';
BEGIN
  -- 既存データを削除（冪等性確保）
  DELETE FROM achievements WHERE user_id IN (user_stakeaki, user_rimorimo, user_takeakishimatsu);
  DELETE FROM entries WHERE user_id IN (user_stakeaki, user_rimorimo, user_takeakishimatsu);
END $$;

-- ================================================
-- 1. s.takeaki0817@gmail.com (stakeaki0817)
-- 期間: 12/20 - 1/3（15日間連続）
-- 投稿数: 約40件（2-3件/日）
-- 達成: streak_days: 3, 7, 14 / total_posts: 10
-- ================================================

-- 12/20（金）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '☕ 朝のコーヒー', false, (DATE '2025-12-20' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '💼 仕事スタート', false, (DATE '2025-12-20' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍜 ラーメン食べた', true, (DATE '2025-12-20' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/21（土）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🛏️ ゆっくり起きた', false, (DATE '2025-12-21' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '📺 映画観た', false, (DATE '2025-12-21' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/22（日）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🏃 散歩した', false, (DATE '2025-12-22' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍕 ピザ食べた', true, (DATE '2025-12-22' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '📖 読書した', false, (DATE '2025-12-22' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/23（月）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '💪 筋トレした', false, (DATE '2025-12-23' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🎄 クリスマス準備', true, (DATE '2025-12-23' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/24（火）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🎅 クリスマスイブ！', true, (DATE '2025-12-24' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍗 チキン食べた', false, (DATE '2025-12-24' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🎂 ケーキおいしい', true, (DATE '2025-12-24' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/25（水）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🎁 プレゼント開けた', true, (DATE '2025-12-25' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🛋️ のんびりした', false, (DATE '2025-12-25' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/26（木）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '💼 仕事納め近づく', false, (DATE '2025-12-26' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '📝 タスク整理', false, (DATE '2025-12-26' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍺 飲み会', true, (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/27（金）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🎯 仕事納め！', true, (DATE '2025-12-27' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍶 忘年会', false, (DATE '2025-12-27' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/28（土）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🧹 大掃除スタート', false, (DATE '2025-12-28' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🗑️ 断捨離した', false, (DATE '2025-12-28' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/29（日）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🧼 掃除完了', true, (DATE '2025-12-29' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '😴 疲れた', false, (DATE '2025-12-29' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/30（月）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🛒 買い出し', false, (DATE '2025-12-30' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍲 おせち準備', false, (DATE '2025-12-30' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '📺 紅白観る準備', false, (DATE '2025-12-30' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/31（火）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🎍 大晦日！', true, (DATE '2025-12-31' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍜 年越しそば', true, (DATE '2025-12-31' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🎶 紅白見てる', false, (DATE '2025-12-31' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/1（水）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🎉 あけおめ！', true, (DATE '2026-01-01' + TIME '00:05:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '00:05:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🍱 おせち食べた', true, (DATE '2026-01-01' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '⛩️ 初詣行った', true, (DATE '2026-01-01' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/2（木）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '🛋️ 正月休み', false, (DATE '2026-01-02' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '📺 箱根駅伝', false, (DATE '2026-01-02' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/3（金）
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('59499823-a82e-4503-933c-8593ac1dec1d', '📺 駅伝復路', false, (DATE '2026-01-03' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '🎯 今年の目標考えた', true, (DATE '2026-01-03' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', '✨ 良い年にするぞ', true, (DATE '2026-01-03' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');


-- ================================================
-- 2. rimorimo0817@gmail.com (rimorimo0817)
-- 期間: 12/25 - 1/3（10日間連続）
-- 投稿数: 約55件（5-6件/日）
-- 達成: streak_days: 3, 7 / total_posts: 10, 50 / daily_posts: 5
-- ================================================

-- 12/25（水）6件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎄 メリクリ！', true, (DATE '2025-12-25' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎁 プレゼントもらった', true, (DATE '2025-12-25' + TIME '09:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '09:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '☕ カフェ行った', false, (DATE '2025-12-25' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍰 ケーキ食べた', true, (DATE '2025-12-25' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '📺 クリスマス映画', false, (DATE '2025-12-25' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🌙 いい1日だった', false, (DATE '2025-12-25' + TIME '23:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '23:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/26（木）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🌅 早起きした', false, (DATE '2025-12-26' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🏃 ジョギング', false, (DATE '2025-12-26' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍳 朝ごはん作った', false, (DATE '2025-12-26' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '📚 本読んだ', false, (DATE '2025-12-26' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎮 ゲームした', true, (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/27（金）6件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '☀️ いい天気', false, (DATE '2025-12-27' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🛒 買い物', false, (DATE '2025-12-27' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍝 パスタ作った', true, (DATE '2025-12-27' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '😴 昼寝', false, (DATE '2025-12-27' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍺 友達と飲み', true, (DATE '2025-12-27' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🚃 終電セーフ', false, (DATE '2025-12-27' + TIME '23:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '23:30:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/28（土）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🛏️ 二日酔い', false, (DATE '2025-12-28' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍜 しじみ汁', false, (DATE '2025-12-28' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🧹 掃除した', false, (DATE '2025-12-28' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎵 音楽聴いた', false, (DATE '2025-12-28' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '📺 YouTube見た', false, (DATE '2025-12-28' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/29（日）6件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '☕ モーニング', false, (DATE '2025-12-29' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🏠 実家帰省', true, (DATE '2025-12-29' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🚗 渋滞やばい', false, (DATE '2025-12-29' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🏠 実家着いた', true, (DATE '2025-12-29' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍲 母の手料理', true, (DATE '2025-12-29' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '👨‍👩‍👧 家族団らん', true, (DATE '2025-12-29' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/30（月）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🐕 犬の散歩', false, (DATE '2025-12-30' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍳 実家の朝ごはん', false, (DATE '2025-12-30' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🛒 年末の買い出し', false, (DATE '2025-12-30' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍲 おせち手伝い', false, (DATE '2025-12-30' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍶 お酒買った', true, (DATE '2025-12-30' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/31（火）6件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎍 大晦日だ！', true, (DATE '2025-12-31' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🧹 最後の掃除', false, (DATE '2025-12-31' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍱 おせち完成', true, (DATE '2025-12-31' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍜 年越しそば', true, (DATE '2025-12-31' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎶 紅白歌合戦', false, (DATE '2025-12-31' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '⏰ カウントダウン', true, (DATE '2025-12-31' + TIME '23:55:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '23:55:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/1（水）5件以上 → daily_posts: 5 達成
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎉 あけましておめでとう！', true, (DATE '2026-01-01' + TIME '00:01:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '00:01:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍶 乾杯！', true, (DATE '2026-01-01' + TIME '00:10:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '00:10:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍱 おせち最高', true, (DATE '2026-01-01' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '⛩️ 初詣', true, (DATE '2026-01-01' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🎋 おみくじ大吉！', true, (DATE '2026-01-01' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🛋️ まったり', false, (DATE '2026-01-01' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/2（木）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '📺 箱根駅伝', false, (DATE '2026-01-02' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍙 お雑煮', false, (DATE '2026-01-02' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '👨‍👩‍👧 親戚の集まり', true, (DATE '2026-01-02' + TIME '13:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '13:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🧒 甥っ子と遊んだ', true, (DATE '2026-01-02' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🍺 また飲み', false, (DATE '2026-01-02' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/3（金）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '📺 駅伝復路', false, (DATE '2026-01-03' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🚗 帰宅準備', false, (DATE '2026-01-03' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '👋 実家出発', true, (DATE '2026-01-03' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '🏠 帰宅！', true, (DATE '2026-01-03' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', '✨ いい正月だった', true, (DATE '2026-01-03' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');


-- ================================================
-- 3. takeaki.shimatsu@tomap.co (takeakishimatsu)
-- 期間: 12/15 - 1/3（20日間連続）
-- 投稿数: 約105件（5件/日、1/2は10件）
-- 達成: streak_days: 3, 7, 14 / total_posts: 10, 50, 100 / daily_posts: 5, 10
-- ================================================

-- 12/15（月）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '☀️ 朝活スタート', false, (DATE '2025-12-15' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-15' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '☕ コーヒー', false, (DATE '2025-12-15' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-15' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '💼 出社', false, (DATE '2025-12-15' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-15' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍱 ランチ', false, (DATE '2025-12-15' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-15' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏠 退勤', false, (DATE '2025-12-15' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-15' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/16（火）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏃 朝ラン', true, (DATE '2025-12-16' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-16' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🥐 朝食', false, (DATE '2025-12-16' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-16' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📊 会議', false, (DATE '2025-12-16' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-16' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍜 つけ麺', true, (DATE '2025-12-16' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-16' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📚 読書', false, (DATE '2025-12-16' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-16' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/17（水）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '💪 筋トレ', true, (DATE '2025-12-17' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-17' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🥗 サラダ', false, (DATE '2025-12-17' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-17' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '💻 コーディング', false, (DATE '2025-12-17' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-17' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍛 カレー', false, (DATE '2025-12-17' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-17' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎮 ゲーム', true, (DATE '2025-12-17' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-17' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/18（木）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🌅 早起き', false, (DATE '2025-12-18' + TIME '05:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-18' + TIME '05:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🧘 ストレッチ', false, (DATE '2025-12-18' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-18' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍣 お寿司', true, (DATE '2025-12-18' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-18' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '☕ カフェ', false, (DATE '2025-12-18' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-18' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📺 Netflix', false, (DATE '2025-12-18' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-18' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/19（金）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏃 ジョギング', false, (DATE '2025-12-19' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-19' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍞 トースト', false, (DATE '2025-12-19' + TIME '07:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-19' + TIME '07:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎯 目標達成', true, (DATE '2025-12-19' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-19' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍺 金曜の飲み', true, (DATE '2025-12-19' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-19' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🚃 終電', false, (DATE '2025-12-19' + TIME '23:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-19' + TIME '23:30:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/20（土）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛏️ 寝坊', false, (DATE '2025-12-20' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍳 ブランチ', false, (DATE '2025-12-20' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛒 買い物', false, (DATE '2025-12-20' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎬 映画', true, (DATE '2025-12-20' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍕 ピザ', false, (DATE '2025-12-20' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-20' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/21（日）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '☀️ いい天気', false, (DATE '2025-12-21' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🚶 散歩', false, (DATE '2025-12-21' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '☕ スタバ', true, (DATE '2025-12-21' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📚 読書', false, (DATE '2025-12-21' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍜 ラーメン', true, (DATE '2025-12-21' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-21' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/22（月）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '💪 朝トレ', false, (DATE '2025-12-22' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '06:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🥪 サンドイッチ', false, (DATE '2025-12-22' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📊 プレゼン準備', false, (DATE '2025-12-22' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍝 パスタ', false, (DATE '2025-12-22' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎵 音楽', false, (DATE '2025-12-22' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-22' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/23（火）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏃 ランニング', true, (DATE '2025-12-23' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '06:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🥐 クロワッサン', false, (DATE '2025-12-23' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎄 クリスマス準備', true, (DATE '2025-12-23' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍖 焼肉', true, (DATE '2025-12-23' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎁 プレゼント買った', true, (DATE '2025-12-23' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-23' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/24（水）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎅 クリスマスイブ！', true, (DATE '2025-12-24' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎄 飾り付け', true, (DATE '2025-12-24' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍗 チキン', true, (DATE '2025-12-24' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍰 ケーキ', true, (DATE '2025-12-24' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎁 プレゼント交換', true, (DATE '2025-12-24' + TIME '21:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-24' + TIME '21:30:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/25（木）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎄 メリークリスマス', true, (DATE '2025-12-25' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛋️ ゆっくり', false, (DATE '2025-12-25' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📺 映画鑑賞', false, (DATE '2025-12-25' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍛 残りカレー', false, (DATE '2025-12-25' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎮 ゲーム三昧', true, (DATE '2025-12-25' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-25' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/26（金）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '💼 仕事納め', true, (DATE '2025-12-26' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📝 引き継ぎ', false, (DATE '2025-12-26' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍱 最後のランチ', false, (DATE '2025-12-26' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎉 納会', true, (DATE '2025-12-26' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍻 二次会', true, (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/27（土）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛏️ 二日酔い回復', false, (DATE '2025-12-27' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍜 ラーメン', false, (DATE '2025-12-27' + TIME '13:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '13:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🧹 大掃除開始', false, (DATE '2025-12-27' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🗑️ 断捨離', false, (DATE '2025-12-27' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍺 ビール', false, (DATE '2025-12-27' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-27' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/28（日）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🧹 掃除続き', false, (DATE '2025-12-28' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛒 買い出し', false, (DATE '2025-12-28' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍲 鍋', true, (DATE '2025-12-28' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📺 バラエティ', false, (DATE '2025-12-28' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🌙 早寝', false, (DATE '2025-12-28' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-28' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/29（月）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🧼 掃除完了！', true, (DATE '2025-12-29' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '✨ スッキリ', true, (DATE '2025-12-29' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '12:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏠 実家へ', true, (DATE '2025-12-29' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍲 実家の夕飯', true, (DATE '2025-12-29' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '👨‍👩‍👧 家族', true, (DATE '2025-12-29' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-29' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/30（火）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🐕 犬の散歩', false, (DATE '2025-12-30' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '07:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍳 朝ごはん', false, (DATE '2025-12-30' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '08:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛒 年末買い出し', false, (DATE '2025-12-30' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍲 おせち準備', false, (DATE '2025-12-30' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍶 日本酒', true, (DATE '2025-12-30' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-30' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 12/31（水）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎍 大晦日', true, (DATE '2025-12-31' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍱 おせち完成', true, (DATE '2025-12-31' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍜 年越しそば', true, (DATE '2025-12-31' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎶 紅白', false, (DATE '2025-12-31' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '⏰ カウントダウン', true, (DATE '2025-12-31' + TIME '23:55:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2025-12-31' + TIME '23:55:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/1（木）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎉 あけおめ！', true, (DATE '2026-01-01' + TIME '00:01:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '00:01:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍶 乾杯', true, (DATE '2026-01-01' + TIME '00:10:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '00:10:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍱 おせち', true, (DATE '2026-01-01' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '⛩️ 初詣', true, (DATE '2026-01-01' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🛋️ まったり', false, (DATE '2026-01-01' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-01' + TIME '16:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/2（金）10件以上 → daily_posts: 5, 10 達成
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📺 箱根駅伝', false, (DATE '2026-01-02' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍙 お雑煮', false, (DATE '2026-01-02' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '09:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏃 応援熱い！', true, (DATE '2026-01-02' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '10:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎉 ゴール！', true, (DATE '2026-01-02' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍱 昼ごはん', false, (DATE '2026-01-02' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '12:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '👨‍👩‍👧 親戚集合', true, (DATE '2026-01-02' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🧒 甥っ子と遊ぶ', true, (DATE '2026-01-02' + TIME '15:30:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '15:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📸 集合写真', true, (DATE '2026-01-02' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '17:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🍺 宴会スタート', true, (DATE '2026-01-02' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🎤 カラオケ', true, (DATE '2026-01-02' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🌙 楽しい1日', true, (DATE '2026-01-02' + TIME '23:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-02' + TIME '23:00:00') AT TIME ZONE 'Asia/Tokyo');

-- 1/3（土）5件
INSERT INTO entries (user_id, content, is_shared, created_at, updated_at) VALUES
('1767fbeb-e86a-4308-888d-fa3971b2b016', '📺 駅伝復路', false, (DATE '2026-01-03' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '08:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏆 優勝！', true, (DATE '2026-01-03' + TIME '13:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '13:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🚗 帰宅', true, (DATE '2026-01-03' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '15:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '🏠 到着', true, (DATE '2026-01-03' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '18:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', '✨ いい正月だった', true, (DATE '2026-01-03' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo', (DATE '2026-01-03' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo');


-- ================================================
-- 達成イベント（achievements）を作成
-- ================================================

-- stakeaki0817: streak_days: 3, 7, 14 / total_posts: 10
INSERT INTO achievements (user_id, type, threshold, value, is_shared, created_at) VALUES
-- streak_days
('59499823-a82e-4503-933c-8593ac1dec1d', 'streak_days', 3, 3, false, (DATE '2025-12-22' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', 'streak_days', 7, 7, false, (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('59499823-a82e-4503-933c-8593ac1dec1d', 'streak_days', 14, 14, false, (DATE '2026-01-02' + TIME '11:00:00') AT TIME ZONE 'Asia/Tokyo'),
-- total_posts
('59499823-a82e-4503-933c-8593ac1dec1d', 'total_posts', 10, 10, false, (DATE '2025-12-23' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo');

-- rimorimo0817: streak_days: 3, 7 / total_posts: 10, 50 / daily_posts: 5
INSERT INTO achievements (user_id, type, threshold, value, is_shared, created_at) VALUES
-- streak_days
('0ed83e5c-8fee-4207-95e5-126d446c6de6', 'streak_days', 3, 3, false, (DATE '2025-12-27' + TIME '23:30:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', 'streak_days', 7, 7, false, (DATE '2025-12-31' + TIME '23:55:00') AT TIME ZONE 'Asia/Tokyo'),
-- total_posts
('0ed83e5c-8fee-4207-95e5-126d446c6de6', 'total_posts', 10, 10, false, (DATE '2025-12-26' + TIME '20:00:00') AT TIME ZONE 'Asia/Tokyo'),
('0ed83e5c-8fee-4207-95e5-126d446c6de6', 'total_posts', 50, 50, false, (DATE '2026-01-03' + TIME '14:00:00') AT TIME ZONE 'Asia/Tokyo'),
-- daily_posts
('0ed83e5c-8fee-4207-95e5-126d446c6de6', 'daily_posts', 5, 5, false, (DATE '2026-01-01' + TIME '11:30:00') AT TIME ZONE 'Asia/Tokyo');

-- takeakishimatsu: streak_days: 3, 7, 14 / total_posts: 10, 50, 100 / daily_posts: 5, 10
INSERT INTO achievements (user_id, type, threshold, value, is_shared, created_at) VALUES
-- streak_days
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'streak_days', 3, 3, false, (DATE '2025-12-17' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'streak_days', 7, 7, false, (DATE '2025-12-21' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'streak_days', 14, 14, false, (DATE '2025-12-28' + TIME '22:00:00') AT TIME ZONE 'Asia/Tokyo'),
-- total_posts
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'total_posts', 10, 10, false, (DATE '2025-12-16' + TIME '21:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'total_posts', 50, 50, false, (DATE '2025-12-24' + TIME '21:30:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'total_posts', 100, 100, false, (DATE '2026-01-02' + TIME '23:00:00') AT TIME ZONE 'Asia/Tokyo'),
-- daily_posts
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'daily_posts', 5, 5, false, (DATE '2025-12-15' + TIME '19:00:00') AT TIME ZONE 'Asia/Tokyo'),
('1767fbeb-e86a-4308-888d-fa3971b2b016', 'daily_posts', 10, 10, false, (DATE '2026-01-02' + TIME '23:00:00') AT TIME ZONE 'Asia/Tokyo');


-- ================================================
-- ストリーク情報を更新
-- ================================================

-- stakeaki0817: 15日連続
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  '59499823-a82e-4503-933c-8593ac1dec1d',
  15,
  15,
  DATE '2026-01-03',
  2,
  ARRAY[]::DATE[]
)
ON CONFLICT (user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  last_entry_date = EXCLUDED.last_entry_date,
  hotsure_remaining = EXCLUDED.hotsure_remaining,
  hotsure_used_dates = EXCLUDED.hotsure_used_dates;

-- rimorimo0817: 10日連続
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  '0ed83e5c-8fee-4207-95e5-126d446c6de6',
  10,
  10,
  DATE '2026-01-03',
  2,
  ARRAY[]::DATE[]
)
ON CONFLICT (user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  last_entry_date = EXCLUDED.last_entry_date,
  hotsure_remaining = EXCLUDED.hotsure_remaining,
  hotsure_used_dates = EXCLUDED.hotsure_used_dates;

-- takeakishimatsu: 20日連続
INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date, hotsure_remaining, hotsure_used_dates)
VALUES (
  '1767fbeb-e86a-4308-888d-fa3971b2b016',
  20,
  20,
  DATE '2026-01-03',
  2,
  ARRAY[]::DATE[]
)
ON CONFLICT (user_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  last_entry_date = EXCLUDED.last_entry_date,
  hotsure_remaining = EXCLUDED.hotsure_remaining,
  hotsure_used_dates = EXCLUDED.hotsure_used_dates;


-- ================================================
-- 確認用クエリ
-- ================================================
SELECT '=== 投入結果 ===' as info;

SELECT
  u.username,
  u.display_name,
  COUNT(e.id) as entry_count,
  s.current_streak,
  s.longest_streak
FROM users u
LEFT JOIN entries e ON u.id = e.user_id
LEFT JOIN streaks s ON u.id = s.user_id
WHERE u.id IN (
  '59499823-a82e-4503-933c-8593ac1dec1d',
  '0ed83e5c-8fee-4207-95e5-126d446c6de6',
  '1767fbeb-e86a-4308-888d-fa3971b2b016'
)
GROUP BY u.id, u.username, u.display_name, s.current_streak, s.longest_streak
ORDER BY u.username;

SELECT '=== 日別投稿数（daily_posts検証用）===' as info;

SELECT
  u.username,
  DATE(e.created_at AT TIME ZONE 'Asia/Tokyo') as entry_date,
  COUNT(*) as daily_count
FROM entries e
JOIN users u ON e.user_id = u.id
WHERE u.id IN (
  '59499823-a82e-4503-933c-8593ac1dec1d',
  '0ed83e5c-8fee-4207-95e5-126d446c6de6',
  '1767fbeb-e86a-4308-888d-fa3971b2b016'
)
GROUP BY u.username, DATE(e.created_at AT TIME ZONE 'Asia/Tokyo')
HAVING COUNT(*) >= 5
ORDER BY u.username, entry_date;
