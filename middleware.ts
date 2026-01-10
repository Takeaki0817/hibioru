import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 認証不要なパス（完全一致のみ）
const PUBLIC_PATHS_EXACT = ['/', '/login', '/offline', '/lp']

// 認証不要なパス（プレフィックス一致）
const PUBLIC_PATHS_PREFIX = ['/auth/callback']

// パスが認証不要かどうかを判定
function isPublicPath(pathname: string): boolean {
  // 完全一致チェック
  if (PUBLIC_PATHS_EXACT.includes(pathname)) {
    return true
  }
  // プレフィックス一致チェック（/auth/callback のみ）
  return PUBLIC_PATHS_PREFIX.some(path => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 認証不要なパスの場合、セッション確認をスキップ（高速化）
  // ただし、ログインページとルートはリダイレクト判定が必要なため除外
  if (pathname !== '/' && pathname !== '/login' && isPublicPath(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションを更新（重要：getUser()を呼び出すことでセッションが更新される）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 未認証ユーザーを保護されたルートからログインページへリダイレクト
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーがログインページまたはルートにアクセスした場合はタイムラインへ
  if (user && (pathname === '/login' || pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/timeline'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // 静的ファイル、APIルート、PWA関連ファイルを除外
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
