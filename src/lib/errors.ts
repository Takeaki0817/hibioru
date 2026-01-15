/**
 * ビジネスロジックエラー
 *
 * ユーザーが対応可能なエラー（投稿制限、バリデーション等）
 * このエラーのメッセージはそのままユーザーに表示される
 *
 * 使用例:
 * - 投稿制限: throw new BusinessLogicError('本日の投稿上限（15件）に達しました')
 * - バリデーション: throw new BusinessLogicError('内容を入力してください')
 *
 * 内部エラー（DB接続失敗等）には使用しないこと
 */
export class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessLogicError'
  }
}

/**
 * ビジネスロジックエラーかどうかを判定
 */
export function isBusinessLogicError(error: unknown): error is BusinessLogicError {
  return error instanceof BusinessLogicError
}
