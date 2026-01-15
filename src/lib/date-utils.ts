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

/**
 * YYYY-MM-DD形式の日付文字列をJST基準のDateオブジェクトに変換
 * タイムゾーン未指定の日付文字列をJSTとして解釈する
 * @param dateString YYYY-MM-DD形式の日付文字列
 * @returns JSTの0:00:00を示すDateオブジェクト
 */
export function parseJSTDateString(dateString: string): Date {
  // YYYY-MM-DD形式にJSTオフセット（+09:00）を付与して解析
  // これにより、どのタイムゾーンのブラウザでも同じUTC時刻として解釈される
  return new Date(`${dateString}T00:00:00+09:00`)
}

/**
 * JST基準で指定月の開始・終了時刻を取得（UTC）
 * @param referenceDate 基準日時（デフォルト: 現在時刻）
 * @returns start: 当月1日0:00:00のUTC、end: 翌月1日0:00:00のUTC
 */
export function getJSTMonthBounds(
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  // JSTでの現在時刻を計算
  const jstNow = new Date(referenceDate.getTime() + JST_OFFSET_MS)
  const year = jstNow.getUTCFullYear()
  const month = jstNow.getUTCMonth()

  // JSTでの当月1日0:00を計算
  const jstMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))

  // JSTでの翌月1日0:00を計算
  const jstNextMonthStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0))

  // UTCに戻す（JSTオフセット分を引く）
  const startUtc = new Date(jstMonthStart.getTime() - JST_OFFSET_MS)
  const endUtc = new Date(jstNextMonthStart.getTime() - JST_OFFSET_MS)

  return { start: startUtc, end: endUtc }
}

/**
 * 日時文字列を「○分前」「○時間前」などの相対表示に変換
 * @param dateString ISO 8601形式などの日時文字列
 * @returns 相対時間の文字列
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}
