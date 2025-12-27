// JST（日本標準時）日付処理のユーティリティ

/** JST（UTC+9）のオフセット（ミリ秒） */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 指定した日時をJST基準のYYYY-MM-DD形式に変換
 * @param date 変換対象の日時（デフォルト: 現在時刻）
 * @returns YYYY-MM-DD形式の文字列
 */
export function getJSTDateString(date: Date = new Date()): string {
  const jstDate = new Date(date.getTime() + JST_OFFSET_MS)
  return jstDate.toISOString().split('T')[0]
}

/**
 * JST基準で本日の日付を取得
 * @returns YYYY-MM-DD形式の文字列
 */
export function getJSTToday(): string {
  return getJSTDateString(new Date())
}

/**
 * JST基準で指定日の開始・終了時刻を取得（UTC）
 * @param referenceDate 基準日時（デフォルト: 現在時刻）
 * @returns start: 当日0:00:00のUTC、end: 翌日0:00:00のUTC
 */
export function getJSTDayBounds(
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  // JSTでの現在時刻を計算
  const jstNow = new Date(referenceDate.getTime() + JST_OFFSET_MS)

  // JSTでの当日0:00を計算
  const jstMidnight = new Date(Date.UTC(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate(),
    0, 0, 0, 0
  ))

  // UTCに戻す（JSTオフセット分を引く）
  const startUtc = new Date(jstMidnight.getTime() - JST_OFFSET_MS)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)

  return { start: startUtc, end: endUtc }
}

/**
 * ISO 8601形式の日時文字列をJST基準のYYYY-MM-DD形式に変換
 * @param isoString ISO 8601形式の日時文字列
 * @returns YYYY-MM-DD形式の文字列
 */
export function isoToJSTDateString(isoString: string): string {
  return getJSTDateString(new Date(isoString))
}
