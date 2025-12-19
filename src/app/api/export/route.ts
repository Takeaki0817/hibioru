import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Entry } from '@/features/entry/types'

/**
 * GET /api/export
 * エントリーデータをエクスポート
 *
 * クエリパラメータ:
 * - format: 'json' | 'markdown'
 * - from: 開始日（YYYY-MM-DD形式、オプション）
 * - to: 終了日（YYYY-MM-DD形式、オプション）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    // エントリーデータを取得
    let query = supabase
      .from('entries')
      .select()
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    // 期間フィルタ
    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00Z`)
    }
    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59Z`)
    }

    const { data: entries, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // データが存在しない場合
    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      )
    }

    // ファイル名（日付を含む）
    const dateStr = new Date().toISOString().split('T')[0]
    let filename: string
    let content: string
    let contentType: string

    if (format === 'markdown') {
      // Markdown形式
      filename = `hibioru_export_${dateStr}.md`
      contentType = 'text/markdown; charset=utf-8'
      content = entriesToMarkdown(entries as Entry[])
    } else {
      // JSON形式
      filename = `hibioru_export_${dateStr}.json`
      contentType = 'application/json; charset=utf-8'
      content = JSON.stringify(entries, null, 2)
    }

    // レスポンス
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

/**
 * エントリーをMarkdown形式に変換
 */
function entriesToMarkdown(entries: Entry[]): string {
  let markdown = '# ヒビオル エクスポート\n\n'

  // 日付でグループ化
  const entriesByDate = new Map<string, Entry[]>()
  for (const entry of entries) {
    const date = entry.created_at.split('T')[0]
    if (!entriesByDate.has(date)) {
      entriesByDate.set(date, [])
    }
    entriesByDate.get(date)!.push(entry)
  }

  // 日付ごとに出力
  for (const [date, dateEntries] of entriesByDate) {
    markdown += `## ${date}\n\n`

    for (const entry of dateEntries) {
      const time = entry.created_at.split('T')[1].substring(0, 5)
      markdown += `### ${time}\n\n`
      markdown += `${entry.content}\n\n`

      if (entry.image_urls && entry.image_urls.length > 0) {
        for (const [index, url] of entry.image_urls.entries()) {
          markdown += `![画像${index + 1}](${url})\n\n`
        }
      }

      markdown += '---\n\n'
    }
  }

  return markdown
}
