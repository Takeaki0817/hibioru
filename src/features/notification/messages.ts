/**
 * 通知文言生成サービス (NotificationMessageService)
 *
 * 通知タイプに応じた文言のバリエーションを管理・生成します。
 * 「今考えていること」「残しておきたいこと」を言葉にして残す
 * というヒビオルの思想に基づいた文言設計を採用しています。
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
 * 今考えていることを記録するよう促すメッセージ
 */
export const MAIN_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今考えてること、記録しよう！' },
  { title: NOTIFICATION_TITLE, body: '残しておきたいこと、ある？' },
  { title: NOTIFICATION_TITLE, body: '今の頭の中、書いておこう' },
  { title: NOTIFICATION_TITLE, body: 'ふと思ったこと、メモしておく？' },
  { title: NOTIFICATION_TITLE, body: '今日のひとこと、残しておこう' },
];

/**
 * 追いリマインド1回目用の文言バリエーション
 *
 * Requirements 4.2:
 * 気軽にメモを促すメッセージ
 */
export const FOLLOW_UP_1_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今日のこと、メモしておく？' },
  { title: NOTIFICATION_TITLE, body: 'ひとこと残しておこう' },
  { title: NOTIFICATION_TITLE, body: 'さっき考えてたこと、書いておく？' },
  { title: NOTIFICATION_TITLE, body: '頭の中にあること、残しておこう' },
  { title: NOTIFICATION_TITLE, body: '今のうちにメモしておく？' },
];

/**
 * 追いリマインド2回目用の文言バリエーション
 *
 * Requirements 4.3:
 * 振り返りの価値を伝えるメッセージ
 */
export const FOLLOW_UP_2_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '後で振り返れるように、書いておく？' },
  { title: NOTIFICATION_TITLE, body: '今日あったこと、なんでもいいよ' },
  { title: NOTIFICATION_TITLE, body: '思い出せるうちに、書いておこう' },
  { title: NOTIFICATION_TITLE, body: '今日感じたこと、ひとことでも' },
  { title: NOTIFICATION_TITLE, body: 'あとで見返せるように残しておこう' },
];

/**
 * 追いリマインド3回目用の文言バリエーション
 *
 * 気軽さを強調するメッセージ
 */
export const FOLLOW_UP_3_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今の気持ちを残しておこう' },
  { title: NOTIFICATION_TITLE, body: '絵文字ひとつでもOK' },
  { title: NOTIFICATION_TITLE, body: '今の自分の状態、書いておく？' },
  { title: NOTIFICATION_TITLE, body: 'ひとことだけでも残せるよ' },
  { title: NOTIFICATION_TITLE, body: '今感じてること、なんでもいいよ' },
];

/**
 * 追いリマインド4回目用の文言バリエーション
 *
 * 未来への価値を伝えるメッセージ
 */
export const FOLLOW_UP_4_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今の自分の気持ち、あとから見れるようにしよう！' },
  { title: NOTIFICATION_TITLE, body: '後で見返すと面白いよ' },
  { title: NOTIFICATION_TITLE, body: '未来の自分へのメモ、残しておこう' },
  { title: NOTIFICATION_TITLE, body: 'あとで読み返すと発見があるよ' },
  { title: NOTIFICATION_TITLE, body: '今の考え、忘れないうちに' },
];

/**
 * 追いリマインド5回目用の文言バリエーション（最終）
 *
 * 一日の締めくくりメッセージ
 */
export const FOLLOW_UP_5_MESSAGES: NotificationMessage[] = [
  { title: NOTIFICATION_TITLE, body: '今日もおつかれさま' },
  { title: NOTIFICATION_TITLE, body: '寝る前に考えてることも書いておこう' },
  { title: NOTIFICATION_TITLE, body: '今日の自分、ひとことで残しておこう' },
  { title: NOTIFICATION_TITLE, body: '眠る前の頭の中、書いておく？' },
  { title: NOTIFICATION_TITLE, body: '今日のあなた、記録しておこう' },
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
 * - count=2: FOLLOW_UP_2_MESSAGES（2回目用）
 * - count=3: FOLLOW_UP_3_MESSAGES（3回目用）
 * - count=4: FOLLOW_UP_4_MESSAGES（4回目用）
 * - count>=5: FOLLOW_UP_5_MESSAGES（5回目用・最終）
 *
 * @param count - 追いリマインドの回数（1以上）
 * @returns ランダムに選択された追いリマインドメッセージ
 */
export function getFollowUpMessage(count: number): NotificationMessage {
  if (count <= 1) {
    return randomPick(FOLLOW_UP_1_MESSAGES);
  }
  if (count === 2) {
    return randomPick(FOLLOW_UP_2_MESSAGES);
  }
  if (count === 3) {
    return randomPick(FOLLOW_UP_3_MESSAGES);
  }
  if (count === 4) {
    return randomPick(FOLLOW_UP_4_MESSAGES);
  }
  // 5回目以降は最終通知用の文言
  return randomPick(FOLLOW_UP_5_MESSAGES);
}
