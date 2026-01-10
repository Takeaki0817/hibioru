import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Entry } from '../types'

/**
 * IDでエントリを取得（サーバーコンポーネント用）
 */
export async function getEntry(id: string): Promise<{ ok: true; value: Entry } | { ok: false; error: { code: string; message: string } }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('entries')
      .select()
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'エントリが見つかりません' }
      }
    }

    return { ok: true, value: data as Entry }
  } catch {
    return {
      ok: false,
      error: { code: 'DB_ERROR', message: 'エントリの取得に失敗しました' }
    }
  }
}
