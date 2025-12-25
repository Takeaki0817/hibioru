-- 通知設定のenabledカラムのデフォルト値をfalseに変更
-- 新規ユーザーはデフォルトで通知オフにする

ALTER TABLE notification_settings
ALTER COLUMN enabled SET DEFAULT false;
