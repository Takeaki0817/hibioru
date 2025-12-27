// 共通のResult型（Railway Oriented Programming パターン）

/**
 * 成功または失敗を表す型
 * @template T 成功時の値の型
 * @template E 失敗時のエラーの型
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

/**
 * 成功判定のタイプガード
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok
}

/**
 * 失敗判定のタイプガード
 */
export function isError<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}

/**
 * 成功結果を作成
 */
export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value }
}

/**
 * 失敗結果を作成
 */
export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error }
}
