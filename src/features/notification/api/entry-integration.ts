/**
 * エントリー作成時の通知連携サービス
 *
 * 新規エントリー作成時に以下の処理を行います:
 * - 当日の通知ログのentry_recorded_atを更新（Requirement 6.1）
 * - 追いリマインドのキャンセル処理をトリガー（Requirement 4.4）
 *
 * タスク13.1の実装
 */

import { updateEntryRecorded } from './log';
import { cancelFollowUps } from './followup';

/**
 * エントリー作成イベント
 */
export interface EntryCreatedEvent {
  /** ユーザーID */
  userId: string;
  /** エントリーID */
  entryId: string;
  /** エントリー作成日時 */
  createdAt: Date;
}

/**
 * エントリー連携処理の結果
 */
export interface EntryIntegrationResult {
  /** 通知ログのentry_recorded_atが更新されたか */
  logUpdated: boolean;
  /** 追いリマインドがキャンセルされたか */
  followUpsCancelled: boolean;
}

/**
 * エントリー連携エラー
 */
export type EntryIntegrationError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'UNEXPECTED_ERROR'; message: string };

/**
 * Result型
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * 入力のバリデーション
 */
function validateEvent(event: EntryCreatedEvent): EntryIntegrationError | null {
  if (!event.userId || event.userId.trim() === '') {
    return {
      type: 'VALIDATION_ERROR',
      message: 'userIdは必須です',
    };
  }

  if (!event.entryId || event.entryId.trim() === '') {
    return {
      type: 'VALIDATION_ERROR',
      message: 'entryIdは必須です',
    };
  }

  if (!(event.createdAt instanceof Date) || isNaN(event.createdAt.getTime())) {
    return {
      type: 'VALIDATION_ERROR',
      message: 'createdAtは有効な日付である必要があります',
    };
  }

  return null;
}

/**
 * エントリー作成時の通知連携処理
 *
 * 新規エントリーが作成された際に以下の処理を並列で実行します:
 * 1. 当日の通知ログのentry_recorded_atを更新（通知効果の追跡用）
 * 2. 予定されていた追いリマインドをキャンセル
 *
 * 各処理は独立しており、一方が失敗しても他方は実行されます。
 * エントリー作成自体には影響を与えないため、処理失敗時もエラーログを残して続行します。
 *
 * @param event - エントリー作成イベント
 * @returns 処理結果
 */
export async function handleEntryCreated(
  event: EntryCreatedEvent
): Promise<Result<EntryIntegrationResult, EntryIntegrationError>> {
  // 入力バリデーション
  const validationError = validateEvent(event);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  try {
    // 両方の処理を並列で実行
    const [logResult, cancelResult] = await Promise.all([
      updateEntryRecorded(event.userId, event.createdAt).catch((error) => ({
        ok: false as const,
        error: {
          type: 'DATABASE_ERROR' as const,
          message: error instanceof Error ? error.message : '不明なエラー',
        },
      })),
      cancelFollowUps(event.userId, event.createdAt).catch((error) => ({
        ok: false as const,
        error: {
          type: 'DATABASE_ERROR' as const,
          message: error instanceof Error ? error.message : '不明なエラー',
        },
      })),
    ]);

    // 各処理の結果を返す
    return {
      ok: true,
      value: {
        logUpdated: logResult.ok,
        followUpsCancelled: cancelResult.ok,
      },
    };
  } catch (error) {
    // 予期せぬ例外
    return {
      ok: false,
      error: {
        type: 'UNEXPECTED_ERROR',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
    };
  }
}
