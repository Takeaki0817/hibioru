-- streaks テーブルに updated_at カラムを追加
-- デバッグ・監査用にストリーク更新のタイミングを追跡

-- updated_at カラムを追加（既存レコードは現在時刻で初期化）
ALTER TABLE streaks
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 自動更新トリガーを作成（entries テーブルと同じ関数を再利用）
CREATE TRIGGER streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- コメント
COMMENT ON COLUMN streaks.updated_at IS 'レコード更新日時（デバッグ・監査用）';
