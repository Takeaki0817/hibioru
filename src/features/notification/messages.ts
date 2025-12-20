/**
 * 通知文言生成サービス (NotificationMessageService)
 *
 * 通知タイプに応じた文言のバリエーションを管理・生成します。
 * ADHD当事者にストレスを与えない文言設計を採用しています。
 *
 * Requirements: 3.2, 4.2, 4.3
 * - メインリマインド用の文言バリエーション
 * - 追いリマインド1回目用の文言
 * - 追いリマインド2回目用の文言
 * - ランダム選択ロジック
 */

import { APP_CONFIG } from '@/lib/constants/app-config';

/**
 * 通知メッセージの型
 */
export interface NotificationMessage {
  /** 通知タイトル */
  title: string;
  /** 通知本文 */
  body: string;
}

/** 通知タイトル（共通） */
const NOTIFICATION_TITLE = APP_CONFIG.shortName;

/**
 * メインリマインド用の文言バリエーション
 *
 * Requirements 3.2:
 * - 「今日はどんな一日だった？」
 * - 「一言だけでも残しておこう」
 */
export const MAIN_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今日はどんな一日だった？' },
  { title: NOTIFICATION_TITLE, body: '一言だけでも残しておこう' },
];

/**
 * 追いリマインド1回目用の文言バリエーション
 *
 * Requirements 4.2:
 * - 「まだ間に合うよ」
 * - 「30秒で終わる」
 */
export const FOLLOW_UP_1_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: 'まだ間に合うよ' },
  { title: NOTIFICATION_TITLE, body: '30秒で終わる' },
];

/**
 * 追いリマインド2回目用の文言バリエーション
 *
 * Requirements 4.3:
 * - 「今日の最後のチャンス」
 * - 「ほつれ使う？」
 */
export const FOLLOW_UP_2_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今日の最後のチャンス' },
  { title: NOTIFICATION_TITLE, body: 'ほつれ使う？' },
];

/**
 * 配列からランダムに1要素を選択する
 *
 * @param array - 選択元の配列
 * @returns ランダムに選択された要素
 */
function randomPick<T>(array: T[]): T {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

/**
 * メインリマインド用の通知メッセージを取得する
 *
 * MAIN_MESSAGESからランダムに1つを選択して返します。
 *
 * @returns ランダムに選択されたメインリマインドメッセージ
 */
export function getMainMessage(): NotificationMessage {
  return randomPick(MAIN_MESSAGES);
}

/**
 * 追いリマインド用の通知メッセージを取得する
 *
 * 追いリマインドの回数に応じて適切な文言を返します。
 * - count=1: FOLLOW_UP_1_MESSAGES（1回目用）
 * - count>=2: FOLLOW_UP_2_MESSAGES（2回目以降用）
 *
 * @param count - 追いリマインドの回数（1以上）
 * @returns ランダムに選択された追いリマインドメッセージ
 */
export function getFollowUpMessage(count: number): NotificationMessage {
  // 1以下の場合は1回目として扱う
  if (count <= 1) {
    return randomPick(FOLLOW_UP_1_MESSAGES);
  }

  // 2回目以降は最終通知用の文言
  return randomPick(FOLLOW_UP_2_MESSAGES);
}
