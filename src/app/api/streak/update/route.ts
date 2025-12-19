/**
 * ストリーク更新APIエンドポイント
 * POST /api/streak/update
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateStreakOnEntry } from '@/features/streak/api/service'

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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ストリーク更新
    const result = await updateStreakOnEntry(user.id)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      currentStreak: result.value.currentStreak,
      longestStreak: result.value.longestStreak,
      isNewRecord: result.value.currentStreak === result.value.longestStreak && result.value.currentStreak > 0,
    }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
