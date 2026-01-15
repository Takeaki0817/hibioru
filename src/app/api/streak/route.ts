/**
 * ストリーク情報取得APIエンドポイント
 * GET /api/streak
 */

import { NextResponse, connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStreakInfo } from '@/features/streak/api/service'
import { logger } from '@/lib/logger'

// Next.js 16: createClient()使用で自動的に動的レンダリング

export async function GET() {
  // プリレンダリングからオプトアウト
  await connection()

  try {
    // 認証確認
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // ストリーク情報取得
    const result = await getStreakInfo(user.id)

    if (!result.ok) {
      // 内部エラーはログに記録、ユーザーには汎用メッセージを返す
      logger.error('ストリーク情報取得エラー:', result.error)
      return NextResponse.json(
        { error: '処理中にエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.value, { status: 200 })
  } catch (error) {
    logger.error('ストリークAPI予期せぬエラー:', error)
    return NextResponse.json(
      { error: '処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
