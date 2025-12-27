import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.generated'

/**
 * 管理者用Supabaseクライアント（RLSバイパス）
 * auth.admin API使用時に必要
 * サーバーサイドのみで使用可能
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
