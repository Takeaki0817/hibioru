/**
 * ストリーク更新APIエンドポイント
 * POST /api/streak/update
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateStreakOnEntry } from '@/lib/streak/service'

interface UpdateStreakRequest {
  entryDate?: string
}

export async function POST(request: NextRequest) {
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

    // リクエストボディをパース
    const body: UpdateStreakRequest = await request.json()

    // 日付形式のバリデーション（省略可能）
    if (body.entryDate) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/
      if (!datePattern.test(body.entryDate)) {
        return NextResponse.json(
          { error: 'Invalid date format. Expected YYYY-MM-DD' },
          { status: 400 }
        )
      }
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
  } catch (error) {
    console.error('Failed to update streak:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
