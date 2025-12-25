-- ========================================
-- 複数リマインド機能追加
-- ========================================
-- reminders JSONB配列: 最大5つのリマインド時刻を設定可能
-- 各リマインドは { time: "HH:MM" | null, enabled: boolean } の形式
--
-- 既存データの移行:
-- main_reminder_time の値を reminders[0] に移行

-- reminders カラム追加
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS reminders JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN notification_settings.reminders IS 'リマインド設定の配列 [{time: "HH:MM", enabled: boolean}, ...]';

-- 既存データの移行: main_reminder_time を reminders[0] に移行
UPDATE notification_settings
SET reminders = jsonb_build_array(
  jsonb_build_object(
    'time', to_char(main_reminder_time, 'HH24:MI'),
    'enabled', enabled
  )
)
WHERE reminders = '[]'::jsonb
  AND main_reminder_time IS NOT NULL;

-- 移行後もmain_reminder_timeは残す（後方互換性のため）
-- 将来的に削除する場合は別のマイグレーションで対応
