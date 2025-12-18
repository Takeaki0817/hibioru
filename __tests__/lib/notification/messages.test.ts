/**
 * 通知文言生成ロジックのテスト
 *
 * Requirements: 3.2, 4.2, 4.3
 * - メインリマインド用の文言バリエーション
 * - 追いリマインド1回目用の文言
 * - 追いリマインド2回目用の文言
 * - ランダム選択ロジック
 */

import {
  getMainMessage,
  getFollowUpMessage,
  MAIN_MESSAGES,
  FOLLOW_UP_1_MESSAGES,
  FOLLOW_UP_2_MESSAGES,
  type NotificationMessage,
} from '@/lib/notification/messages';

describe('通知文言生成', () => {
  describe('メッセージ定数', () => {
    describe('MAIN_MESSAGES（メインリマインド文言）', () => {
      it('「今日はどんな一日だった？」を含む', () => {
        const bodies = MAIN_MESSAGES.map((m) => m.body);
        expect(bodies).toContain('今日はどんな一日だった？');
      });

      it('「一言だけでも残しておこう」を含む', () => {
        const bodies = MAIN_MESSAGES.map((m) => m.body);
        expect(bodies).toContain('一言だけでも残しておこう');
      });

      it('すべてのメッセージがタイトルに「ヒビオル」を持つ', () => {
        MAIN_MESSAGES.forEach((msg) => {
          expect(msg.title).toBe('ヒビオル');
        });
      });

      it('2つ以上のバリエーションがある', () => {
        expect(MAIN_MESSAGES.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('FOLLOW_UP_1_MESSAGES（追いリマインド1回目文言）', () => {
      it('「まだ間に合うよ」を含む', () => {
        const bodies = FOLLOW_UP_1_MESSAGES.map((m) => m.body);
        expect(bodies).toContain('まだ間に合うよ');
      });

      it('「30秒で終わる」を含む', () => {
        const bodies = FOLLOW_UP_1_MESSAGES.map((m) => m.body);
        expect(bodies).toContain('30秒で終わる');
      });

      it('すべてのメッセージがタイトルに「ヒビオル」を持つ', () => {
        FOLLOW_UP_1_MESSAGES.forEach((msg) => {
          expect(msg.title).toBe('ヒビオル');
        });
      });

      it('2つ以上のバリエーションがある', () => {
        expect(FOLLOW_UP_1_MESSAGES.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('FOLLOW_UP_2_MESSAGES（追いリマインド2回目文言）', () => {
      it('「今日の最後のチャンス」を含む', () => {
        const bodies = FOLLOW_UP_2_MESSAGES.map((m) => m.body);
        expect(bodies).toContain('今日の最後のチャンス');
      });

      it('「ほつれ使う？」を含む', () => {
        const bodies = FOLLOW_UP_2_MESSAGES.map((m) => m.body);
        expect(bodies).toContain('ほつれ使う？');
      });

      it('すべてのメッセージがタイトルに「ヒビオル」を持つ', () => {
        FOLLOW_UP_2_MESSAGES.forEach((msg) => {
          expect(msg.title).toBe('ヒビオル');
        });
      });

      it('2つ以上のバリエーションがある', () => {
        expect(FOLLOW_UP_2_MESSAGES.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('getMainMessage', () => {
    it('NotificationMessage型のオブジェクトを返す', () => {
      const message = getMainMessage();

      expect(message).toHaveProperty('title');
      expect(message).toHaveProperty('body');
      expect(typeof message.title).toBe('string');
      expect(typeof message.body).toBe('string');
    });

    it('MAIN_MESSAGESのいずれかを返す', () => {
      const message = getMainMessage();

      const isValid = MAIN_MESSAGES.some(
        (m) => m.title === message.title && m.body === message.body
      );
      expect(isValid).toBe(true);
    });

    it('複数回呼び出すとランダムに異なるメッセージを返す可能性がある', () => {
      // 統計的に検証: 100回呼び出して複数種類が出ることを確認
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const message = getMainMessage();
        results.add(message.body);
      }

      // 2種類以上のメッセージが出ていることを確認
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('getFollowUpMessage', () => {
    describe('count=1（追いリマインド1回目）', () => {
      it('NotificationMessage型のオブジェクトを返す', () => {
        const message = getFollowUpMessage(1);

        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('body');
      });

      it('FOLLOW_UP_1_MESSAGESのいずれかを返す', () => {
        const message = getFollowUpMessage(1);

        const isValid = FOLLOW_UP_1_MESSAGES.some(
          (m) => m.title === message.title && m.body === message.body
        );
        expect(isValid).toBe(true);
      });

      it('複数回呼び出すとランダムに異なるメッセージを返す可能性がある', () => {
        const results = new Set<string>();
        for (let i = 0; i < 100; i++) {
          const message = getFollowUpMessage(1);
          results.add(message.body);
        }

        expect(results.size).toBeGreaterThan(1);
      });
    });

    describe('count=2（追いリマインド2回目）', () => {
      it('NotificationMessage型のオブジェクトを返す', () => {
        const message = getFollowUpMessage(2);

        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('body');
      });

      it('FOLLOW_UP_2_MESSAGESのいずれかを返す', () => {
        const message = getFollowUpMessage(2);

        const isValid = FOLLOW_UP_2_MESSAGES.some(
          (m) => m.title === message.title && m.body === message.body
        );
        expect(isValid).toBe(true);
      });

      it('複数回呼び出すとランダムに異なるメッセージを返す可能性がある', () => {
        const results = new Set<string>();
        for (let i = 0; i < 100; i++) {
          const message = getFollowUpMessage(2);
          results.add(message.body);
        }

        expect(results.size).toBeGreaterThan(1);
      });
    });

    describe('count=3（追いリマインド3回目）', () => {
      it('FOLLOW_UP_2_MESSAGESのいずれかを返す（最大回数用文言）', () => {
        const message = getFollowUpMessage(3);

        const isValid = FOLLOW_UP_2_MESSAGES.some(
          (m) => m.title === message.title && m.body === message.body
        );
        expect(isValid).toBe(true);
      });
    });

    describe('不正なcount', () => {
      it('count=0は追いリマインド1回目の文言を返す', () => {
        const message = getFollowUpMessage(0);

        const isValid = FOLLOW_UP_1_MESSAGES.some(
          (m) => m.title === message.title && m.body === message.body
        );
        expect(isValid).toBe(true);
      });

      it('負の値は追いリマインド1回目の文言を返す', () => {
        const message = getFollowUpMessage(-1);

        const isValid = FOLLOW_UP_1_MESSAGES.some(
          (m) => m.title === message.title && m.body === message.body
        );
        expect(isValid).toBe(true);
      });
    });
  });

  describe('ランダム選択のシード対応', () => {
    // 確定的なテストのために、Math.randomをモック化してテスト
    it('ランダム値0.0の場合、配列の最初の要素を返す', () => {
      const originalRandom = Math.random;
      Math.random = () => 0;

      try {
        const message = getMainMessage();
        expect(message).toEqual(MAIN_MESSAGES[0]);
      } finally {
        Math.random = originalRandom;
      }
    });

    it('ランダム値0.9999の場合、配列の最後の要素を返す', () => {
      const originalRandom = Math.random;
      Math.random = () => 0.9999;

      try {
        const message = getMainMessage();
        expect(message).toEqual(MAIN_MESSAGES[MAIN_MESSAGES.length - 1]);
      } finally {
        Math.random = originalRandom;
      }
    });
  });
});
