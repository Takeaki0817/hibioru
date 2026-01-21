import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Entry } from '@/features/entry/types'
import { parseJSTDateString, getJSTDateString, isoToJSTDateString } from '@/lib/date-utils'

// Next.js 16: createClient()使用で自動的に動的レンダリング

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

    // 期間フィルタ（JST基準）
    // fromDateをJSTの0:00として解釈し、UTC時刻に変換
    if (fromDate) {
      const fromDateJST = parseJSTDateString(fromDate)
      query = query.gte('created_at', fromDateJST.toISOString())
    }
    // toDateをJSTの23:59:59として解釈し、UTC時刻に変換
    if (toDate) {
      const toDateJST = parseJSTDateString(toDate)
      // JSTの翌日0:00の直前（23:59:59.999）まで含める
      const toDateEndJST = new Date(toDateJST.getTime() + 24 * 60 * 60 * 1000 - 1)
      query = query.lte('created_at', toDateEndJST.toISOString())
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

    // ファイル名（JST基準の日付を含む）
    const dateStr = getJSTDateString()
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
 * エントリーをMarkdown形式に変換（JST基準で日付グループ化）
 */
function entriesToMarkdown(entries: Entry[]): string {
  let markdown = '# ヒビオル エクスポート\n\n'

  // 日付でグループ化（JST基準）
  const entriesByDate = new Map<string, Entry[]>()
  for (const entry of entries) {
    // ISO文字列をJST基準のYYYY-MM-DD形式に変換
    const date = isoToJSTDateString(entry.created_at)
    if (!entriesByDate.has(date)) {
      entriesByDate.set(date, [])
    }
    entriesByDate.get(date)!.push(entry)
  }

  // 日付ごとに出力
  for (const [date, dateEntries] of entriesByDate) {
    markdown += `## ${date}\n\n`

    for (const entry of dateEntries) {
      // 時刻をJST形式で表示
      const entryDate = new Date(entry.created_at)
      const time = entryDate.toLocaleTimeString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
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
