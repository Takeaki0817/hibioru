/**
 * ストリーク更新APIエンドポイント
 * POST /api/streak/update
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateStreakOnEntry } from '@/features/streak/api/service'
import { logger } from '@/lib/logger'

export async function POST() {
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

    // ストリーク更新
    const result = await updateStreakOnEntry(user.id)

    if (!result.ok) {
      // 内部エラーはログに記録、ユーザーには汎用メッセージを返す
      logger.error('ストリーク更新エラー:', result.error)
      return NextResponse.json(
        { error: '処理中にエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      currentStreak: result.value.currentStreak,
      longestStreak: result.value.longestStreak,
      isNewRecord: result.value.currentStreak === result.value.longestStreak && result.value.currentStreak > 0,
    }, { status: 200 })
  } catch (error) {
    logger.error('ストリーク更新API予期せぬエラー:', error)
    return NextResponse.json(
      { error: '処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
