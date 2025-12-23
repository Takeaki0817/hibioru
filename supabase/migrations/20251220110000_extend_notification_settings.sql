-- ========================================
-- notification_settings テーブル拡張
-- ========================================
-- Edge Function (send-notifications) が必要とするカラムを追加
--
-- 問題: Edge Functionが参照しているカラムがDBに存在しなかった
-- - timezone: ユーザーのタイムゾーン
-- - follow_up_max_count: 追いリマインド最大回数
-- - active_days: 通知を送信する曜日

-- タイムゾーン（デフォルト: Asia/Tokyo）
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo';

COMMENT ON COLUMN notification_settings.timezone IS 'ユーザーのタイムゾーン（IANA形式）';

-- 追いリマインド最大回数（デフォルト: 2回）
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS follow_up_max_count INTEGER NOT NULL DEFAULT 2;

COMMENT ON COLUMN notification_settings.follow_up_max_count IS '追いリマインドの最大送信回数';

-- 通知を送信する曜日（デフォルト: 毎日）
-- 0=日曜, 1=月曜, ..., 6=土曜
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS active_days INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6];

COMMENT ON COLUMN notification_settings.active_days IS '通知を送信する曜日（0=日曜, 1=月曜, ..., 6=土曜）';
