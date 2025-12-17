/**
 * ストリーク情報取得APIエンドポイント
 * GET /api/streak
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStreakInfo } from '@/lib/streak/service'

export async function GET() {
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

    // ストリーク情報取得
    const result = await getStreakInfo(user.id)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(result.value, { status: 200 })
  } catch (error) {
    console.error('Failed to get streak info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
