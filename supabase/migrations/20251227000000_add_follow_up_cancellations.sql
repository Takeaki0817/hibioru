-- 追いリマインドキャンセル履歴テーブル
-- followup.ts の cancelFollowUps() で使用
CREATE TABLE IF NOT EXISTS follow_up_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, target_date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS follow_up_cancellations_user_date_idx
    ON follow_up_cancellations(user_id, target_date DESC);

-- RLSポリシー
ALTER TABLE follow_up_cancellations ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のキャンセル履歴のみ参照・作成可能
CREATE POLICY "Users can view own cancellations"
    ON follow_up_cancellations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cancellations"
    ON follow_up_cancellations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE follow_up_cancellations IS '追いリマインドのキャンセル履歴';
COMMENT ON COLUMN follow_up_cancellations.target_date IS 'キャンセル対象の日付（JST）';
COMMENT ON COLUMN follow_up_cancellations.cancelled_at IS 'キャンセル実行日時';
