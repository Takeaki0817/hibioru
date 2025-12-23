-- 通知許可プロンプト表示フラグを追加
-- 初回ログイン後に通知許可バナーを表示したかどうかを記録

-- notification_prompt_shown カラムを追加
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS notification_prompt_shown BOOLEAN NOT NULL DEFAULT FALSE;

-- コメント追加
COMMENT ON COLUMN notification_settings.notification_prompt_shown IS '通知許可プロンプトを表示済みかどうか';

-- 既存ユーザーで notification_settings レコードがない場合に作成
INSERT INTO notification_settings (user_id, enabled, notification_prompt_shown)
SELECT id, FALSE, FALSE FROM users
WHERE id NOT IN (SELECT user_id FROM notification_settings)
ON CONFLICT (user_id) DO NOTHING;
