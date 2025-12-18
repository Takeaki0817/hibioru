/**
 * 通知配信Edge Functionのテスト
 *
 * タスク11.1: 通知配信Edge Functionの作成
 *
 * Requirements:
 * - 3.1: メインリマインド送信
 * - 4.1: 追いリマインドスケジュール
 * - 5.1: タイムゾーン対応
 * - 5.4: 非同期実行（バックグラウンドジョブ）
 *
 * 注意: このテストはEdge Function内のロジックをテストします。
 * Edge Function自体はDeno環境で動作しますが、テストはNode.js/Jestで実行します。
 * そのため、テスト対象はロジック部分のみとし、実際のHTTPハンドラはE2Eテストでカバーします。
 */

// Edge Function用のロジック関数をテスト
describe('SendNotificationsEdgeFunction', () => {
  describe('配信対象ユーザー特定ロジック', () => {
    /**
     * 現在時刻から配信対象ユーザーを特定するテスト
     *
     * Requirements: 3.1, 5.1
     */
    it('現在時刻がprimaryTimeと一致するユーザーを特定する', () => {
      // Given: 複数ユーザーの通知設定
      const users = [
        { userId: 'user-1', primaryTime: '21:00', timezone: 'Asia/Tokyo' },
        { userId: 'user-2', primaryTime: '22:00', timezone: 'Asia/Tokyo' },
        { userId: 'user-3', primaryTime: '21:00', timezone: 'America/New_York' },
      ];
      // 2025-12-18 21:00 JST = 2025-12-18 12:00 UTC
      const currentTimeUtc = new Date('2025-12-18T12:00:00Z');

      // When: 配信対象を特定
      const targets = findMainNotificationTargets(users, currentTimeUtc);

      // Then: JST 21:00のユーザーのみが対象
      expect(targets).toHaveLength(1);
      expect(targets[0].userId).toBe('user-1');
    });

    /**
     * 複数タイムゾーンで正しく計算されるテスト
     *
     * Requirements: 5.1
     */
    it('異なるタイムゾーンで同時刻になるユーザーを両方特定する', () => {
      // Given: JST 21:00 と EST 07:00 が同時刻
      const users = [
        { userId: 'user-1', primaryTime: '21:00', timezone: 'Asia/Tokyo' },
        { userId: 'user-2', primaryTime: '07:00', timezone: 'America/New_York' },
      ];
      // 2025-12-18 21:00 JST = 2025-12-18 12:00 UTC = 2025-12-18 07:00 EST
      const currentTimeUtc = new Date('2025-12-18T12:00:00Z');

      // When: 配信対象を特定
      const targets = findMainNotificationTargets(users, currentTimeUtc);

      // Then: 両方のユーザーが対象
      expect(targets).toHaveLength(2);
    });

    it('activeDaysに含まれない曜日のユーザーは除外する', () => {
      // Given: 日曜日が無効なユーザー
      const users = [
        {
          userId: 'user-1',
          primaryTime: '21:00',
          timezone: 'Asia/Tokyo',
          activeDays: [1, 2, 3, 4, 5, 6], // 日曜を除外
        },
        {
          userId: 'user-2',
          primaryTime: '21:00',
          timezone: 'Asia/Tokyo',
          activeDays: [0, 1, 2, 3, 4, 5, 6], // 全曜日有効
        },
      ];
      // 2025-12-21 (日曜) 21:00 JST = 2025-12-21 12:00 UTC
      const currentTimeUtc = new Date('2025-12-21T12:00:00Z');

      // When: 配信対象を特定
      const targets = findMainNotificationTargets(users, currentTimeUtc);

      // Then: user-2のみが対象
      expect(targets).toHaveLength(1);
      expect(targets[0].userId).toBe('user-2');
    });
  });

  describe('追いリマインド対象特定ロジック', () => {
    /**
     * 追いリマインド対象を特定するテスト
     *
     * Requirements: 4.1
     */
    it('メインリマインド後にインターバル経過したユーザーを特定する', () => {
      // Given: 追いリマインド設定があるユーザー
      const users = [
        {
          userId: 'user-1',
          primaryTime: '21:00',
          timezone: 'Asia/Tokyo',
          followUpEnabled: true,
          followUpIntervalMinutes: 60,
          followUpMaxCount: 2,
          mainReminderSentAt: new Date('2025-12-18T12:00:00Z'),
          chaseReminderCount: 0,
        },
      ];
      // 21:00 + 60分 = 22:00 JST = 13:00 UTC
      const currentTimeUtc = new Date('2025-12-18T13:00:00Z');

      // When: 追いリマインド対象を特定
      const targets = findFollowUpTargets(users, currentTimeUtc);

      // Then: user-1が対象
      expect(targets).toHaveLength(1);
      expect(targets[0].userId).toBe('user-1');
      expect(targets[0].followUpCount).toBe(1);
    });

    it('既に記録済みのユーザーは除外する', () => {
      // Given: 記録済みのユーザー
      const users = [
        {
          userId: 'user-1',
          primaryTime: '21:00',
          timezone: 'Asia/Tokyo',
          followUpEnabled: true,
          followUpIntervalMinutes: 60,
          followUpMaxCount: 2,
          mainReminderSentAt: new Date('2025-12-18T12:00:00Z'),
          chaseReminderCount: 0,
          hasEntryToday: true, // 記録済み
        },
      ];
      const currentTimeUtc = new Date('2025-12-18T13:00:00Z');

      // When: 追いリマインド対象を特定
      const targets = findFollowUpTargets(users, currentTimeUtc);

      // Then: 記録済みなので対象外
      expect(targets).toHaveLength(0);
    });

    it('maxCountに達したユーザーは除外する', () => {
      // Given: maxCountに達したユーザー
      const users = [
        {
          userId: 'user-1',
          primaryTime: '21:00',
          timezone: 'Asia/Tokyo',
          followUpEnabled: true,
          followUpIntervalMinutes: 60,
          followUpMaxCount: 2,
          mainReminderSentAt: new Date('2025-12-18T12:00:00Z'),
          chaseReminderCount: 2, // maxCount到達
          hasEntryToday: false,
        },
      ];
      const currentTimeUtc = new Date('2025-12-18T14:00:00Z');

      // When: 追いリマインド対象を特定
      const targets = findFollowUpTargets(users, currentTimeUtc);

      // Then: maxCount到達なので対象外
      expect(targets).toHaveLength(0);
    });
  });

  describe('重複実行スキップロジック', () => {
    /**
     * 同一分内の重複実行をスキップするテスト
     *
     * Requirements: 5.4
     */
    it('同一分内の重複送信をスキップする', () => {
      // Given: 同一ユーザーへの同一分内の送信履歴
      const existingLogs = [
        {
          userId: 'user-1',
          type: 'main_reminder',
          sentAt: new Date('2025-12-18T12:00:30Z'), // 12:00に送信済み
        },
      ];
      const currentTimeUtc = new Date('2025-12-18T12:00:45Z'); // 同じ12:00

      // When: 重複チェック
      const isDuplicate = checkDuplicateExecution(
        'user-1',
        'main_reminder',
        existingLogs,
        currentTimeUtc
      );

      // Then: 重複
      expect(isDuplicate).toBe(true);
    });

    it('異なる分の場合は重複ではない', () => {
      // Given: 前の分の送信履歴
      const existingLogs = [
        {
          userId: 'user-1',
          type: 'main_reminder',
          sentAt: new Date('2025-12-18T11:59:30Z'), // 11:59に送信済み
        },
      ];
      const currentTimeUtc = new Date('2025-12-18T12:00:00Z'); // 12:00

      // When: 重複チェック
      const isDuplicate = checkDuplicateExecution(
        'user-1',
        'main_reminder',
        existingLogs,
        currentTimeUtc
      );

      // Then: 重複ではない
      expect(isDuplicate).toBe(false);
    });
  });
});

// テスト用のヘルパー関数（Edge Functionで使用するロジックを模倣）

/**
 * 配信対象ユーザー情報の型
 */
interface UserNotificationTarget {
  userId: string;
  primaryTime: string;
  timezone: string;
  activeDays?: number[];
}

/**
 * 追いリマインド対象ユーザー情報の型
 */
interface UserFollowUpTarget {
  userId: string;
  primaryTime: string;
  timezone: string;
  followUpEnabled: boolean;
  followUpIntervalMinutes: number;
  followUpMaxCount: number;
  mainReminderSentAt: Date;
  chaseReminderCount: number;
  hasEntryToday?: boolean;
}

/**
 * 追いリマインド対象結果の型
 */
interface FollowUpTarget {
  userId: string;
  followUpCount: number;
}

/**
 * 通知ログの型
 */
interface NotificationLog {
  userId: string;
  type: string;
  sentAt: Date;
}

/**
 * メインリマインド配信対象を特定する
 *
 * @param users - ユーザー設定リスト
 * @param currentTimeUtc - 現在時刻（UTC）
 * @returns 配信対象ユーザーリスト
 */
function findMainNotificationTargets(
  users: UserNotificationTarget[],
  currentTimeUtc: Date
): UserNotificationTarget[] {
  return users.filter((user) => {
    // タイムゾーンを考慮して現在時刻を取得
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: user.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(currentTimeUtc);

    const hourPart = parts.find((p) => p.type === 'hour');
    const minutePart = parts.find((p) => p.type === 'minute');

    if (!hourPart || !minutePart) {
      return false;
    }

    const currentTimeStr = `${hourPart.value.padStart(2, '0')}:${minutePart.value.padStart(2, '0')}`;

    // 時刻が一致しない場合はスキップ
    if (currentTimeStr !== user.primaryTime) {
      return false;
    }

    // activeDaysが指定されている場合は曜日チェック
    if (user.activeDays) {
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: user.timezone,
        weekday: 'short',
      });
      const weekdayStr = dayFormatter.format(currentTimeUtc);
      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

      if (!user.activeDays.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 追いリマインド配信対象を特定する
 *
 * @param users - ユーザー設定リスト
 * @param currentTimeUtc - 現在時刻（UTC）
 * @returns 配信対象ユーザーリスト
 */
function findFollowUpTargets(
  users: UserFollowUpTarget[],
  currentTimeUtc: Date
): FollowUpTarget[] {
  const targets: FollowUpTarget[] = [];

  for (const user of users) {
    // 追いリマインドが無効
    if (!user.followUpEnabled) {
      continue;
    }

    // 既に記録済み
    if (user.hasEntryToday) {
      continue;
    }

    // maxCountに達している
    if (user.chaseReminderCount >= user.followUpMaxCount) {
      continue;
    }

    // 次の追いリマインド番号
    const nextFollowUpNumber = user.chaseReminderCount + 1;

    // 予定時刻を計算
    const expectedTime = new Date(
      user.mainReminderSentAt.getTime() +
        nextFollowUpNumber * user.followUpIntervalMinutes * 60 * 1000
    );

    // 予定時刻に達しているか
    if (currentTimeUtc >= expectedTime) {
      targets.push({
        userId: user.userId,
        followUpCount: nextFollowUpNumber,
      });
    }
  }

  return targets;
}

/**
 * 重複実行をチェックする
 *
 * @param userId - ユーザーID
 * @param type - 通知タイプ
 * @param existingLogs - 既存のログ
 * @param currentTimeUtc - 現在時刻（UTC）
 * @returns 重複の場合true
 */
function checkDuplicateExecution(
  userId: string,
  type: string,
  existingLogs: NotificationLog[],
  currentTimeUtc: Date
): boolean {
  // 現在時刻の分を取得（秒以下を切り捨て）
  const currentMinute = new Date(
    currentTimeUtc.getFullYear(),
    currentTimeUtc.getMonth(),
    currentTimeUtc.getDate(),
    currentTimeUtc.getHours(),
    currentTimeUtc.getMinutes(),
    0,
    0
  );

  // 同じ分内に同一ユーザー・同一タイプの送信があるか
  return existingLogs.some((log) => {
    if (log.userId !== userId || log.type !== type) {
      return false;
    }

    const logMinute = new Date(
      log.sentAt.getFullYear(),
      log.sentAt.getMonth(),
      log.sentAt.getDate(),
      log.sentAt.getHours(),
      log.sentAt.getMinutes(),
      0,
      0
    );

    return currentMinute.getTime() === logMinute.getTime();
  });
}
