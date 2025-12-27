/**
 * 購読登録/解除API
 *
 * POST /api/notifications/subscribe - 購読登録
 * DELETE /api/notifications/subscribe - 購読解除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { subscribe, unsubscribe } from '@/features/notification/api/subscription';

// Next.js 16: createClient()使用で自動的に動的レンダリング

/**
 * リクエストボディのバリデーション
 */
interface SubscribeRequestBody {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string;
}

function isValidSubscribeRequest(body: unknown): body is SubscribeRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  if (!b.subscription || typeof b.subscription !== 'object') return false;
  const sub = b.subscription as Record<string, unknown>;

  if (typeof sub.endpoint !== 'string' || !sub.endpoint) return false;
  if (!sub.keys || typeof sub.keys !== 'object') return false;

  const keys = sub.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== 'string' || !keys.p256dh) return false;
  if (typeof keys.auth !== 'string' || !keys.auth) return false;

  return true;
}

/**
 * POST /api/notifications/subscribe
 * 購読登録
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディの取得とバリデーション
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'リクエストボディが不正です' },
        { status: 400 }
      );
    }

    if (!isValidSubscribeRequest(body)) {
      return NextResponse.json(
        { error: '購読情報が不正です。endpoint, keys.p256dh, keys.authが必要です' },
        { status: 400 }
      );
    }

    // 購読登録
    const result = await subscribe(user.id, {
      endpoint: body.subscription.endpoint,
      keys: {
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
      },
      userAgent: body.userAgent,
    });

    if (!result.ok) {
      // エラータイプに応じたレスポンス
      switch (result.error.type) {
        case 'DUPLICATE_ENDPOINT':
          return NextResponse.json(
            { error: 'このデバイスは既に登録されています' },
            { status: 409 }
          );
        case 'DATABASE_ERROR':
          return NextResponse.json(
            { error: '登録に失敗しました。再試行してください', detail: result.error.message },
            { status: 500 }
          );
        default:
          return NextResponse.json(
            { error: '登録に失敗しました。再試行してください' },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      {
        success: true,
        subscriptionId: result.value.id,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: '予期しないエラーが発生しました。再試行してください' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/subscribe
 * 購読解除
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // クエリパラメータからエンドポイントを取得
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'endpointパラメータが必要です' },
        { status: 400 }
      );
    }

    // 購読解除
    const result = await unsubscribe(user.id, endpoint);

    if (!result.ok) {
      const detail = result.error.type === 'DATABASE_ERROR' ? result.error.message : undefined;
      return NextResponse.json(
        { error: '購読解除に失敗しました', detail },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
