import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/timeline'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // ユーザーが認証をキャンセルした場合（エラーメッセージなしでログインページに戻す）
  if (error === 'access_denied' || errorDescription?.includes('cancel')) {
    return NextResponse.redirect(`${origin}/`)
  }

  // 認証コードがある場合、セッションに交換
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // その他のエラー時はログインページにリダイレクト（エラーメッセージあり）
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
