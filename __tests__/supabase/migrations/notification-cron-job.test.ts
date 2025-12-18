/**
 * 通知cronジョブマイグレーションのテスト
 *
 * タスク11.2: pg_cronジョブの設定
 *
 * Requirements:
 * - 5.4: 非同期実行（バックグラウンドジョブ）
 *
 * 注意: このテストはマイグレーションSQLの構文と設定を検証します。
 * 実際のpg_cron動作はE2Eテストでカバーします。
 */

import * as fs from 'fs';
import * as path from 'path';

describe('通知cronジョブマイグレーション', () => {
  let migrationSql: string;

  beforeAll(() => {
    // マイグレーションファイルを読み込む
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251218100000_notification_cron_job.sql'
    );
    migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  });

  describe('pg_cronジョブの設定', () => {
    /**
     * 毎分実行のcronジョブ登録
     *
     * Requirements: 5.4
     */
    it('毎分実行のcronジョブが登録される', () => {
      // cron.schedule関数が呼ばれている
      expect(migrationSql).toContain('cron.schedule');

      // 毎分実行のcron式（* * * * *）が含まれている
      expect(migrationSql).toMatch(/\*\s+\*\s+\*\s+\*\s+\*/);
    });

    it('send-notificationsという名前でジョブが登録される', () => {
      // ジョブ名が含まれている
      expect(migrationSql).toContain('send-notifications');
    });
  });

  describe('Edge Functionの呼び出し設定', () => {
    /**
     * Edge Functionを呼び出すHTTPリクエスト設定
     *
     * Requirements: 5.4
     */
    it('net.http_postを使用してEdge Functionを呼び出す', () => {
      // pg_netのhttp_post関数が使用されている
      expect(migrationSql).toContain('net.http_post');
    });

    it('send-notifications Edge Functionを呼び出す', () => {
      // Edge FunctionのURLが含まれている
      expect(migrationSql).toContain('/functions/v1/send-notifications');
    });
  });

  describe('認証設定', () => {
    /**
     * Service Role Keyによる認証設定
     *
     * Requirements: 5.4
     */
    it('Vault経由でService Role Keyを取得する', () => {
      // Vaultからシークレットを取得する設定
      expect(migrationSql).toContain('vault.decrypted_secrets');
    });

    it('Authorizationヘッダーを設定する', () => {
      // Bearerトークンの設定
      expect(migrationSql).toContain('Authorization');
      expect(migrationSql).toContain('Bearer');
    });
  });

  describe('冪等性の確保', () => {
    it('既存のジョブを削除してから登録する', () => {
      // unscheduleが先に呼ばれることを確認
      const unscheduleIndex = migrationSql.indexOf('cron.unschedule');
      const scheduleIndex = migrationSql.indexOf('cron.schedule');

      expect(unscheduleIndex).toBeGreaterThan(-1);
      expect(scheduleIndex).toBeGreaterThan(-1);
      expect(unscheduleIndex).toBeLessThan(scheduleIndex);
    });
  });
});
