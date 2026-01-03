-- ソーシャル機能: Supabase Realtimeを有効化

-- Realtimeで変更を受信するには、テーブルをsupabase_realtime publicationに追加する必要がある
-- RLSが有効な状態でRealtimeを使うには REPLICA IDENTITY FULL が必要

-- 1. achievements テーブル（達成イベント）
ALTER TABLE achievements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE achievements;

-- 2. social_notifications テーブル（ソーシャル通知）
ALTER TABLE social_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE social_notifications;

-- 3. celebrations テーブル（お祝い）
ALTER TABLE celebrations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE celebrations;

-- 4. follows テーブル（フォロー関係）
ALTER TABLE follows REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;

COMMENT ON TABLE achievements IS '達成イベントテーブル（Realtime有効）';
COMMENT ON TABLE social_notifications IS 'ソーシャル通知テーブル（Realtime有効）';
COMMENT ON TABLE celebrations IS 'お祝いテーブル（Realtime有効）';
COMMENT ON TABLE follows IS 'フォロー関係テーブル（Realtime有効）';
