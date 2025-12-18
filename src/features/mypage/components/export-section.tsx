'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ExportFormat = 'json' | 'markdown'

export function ExportSection() {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // エクスポート実行
  const handleExport = async () => {
    setError(null)
    setMessage(null)

    // 日付範囲の妥当性チェック
    if (fromDate && toDate && fromDate > toDate) {
      setError('開始日は終了日より前の日付を指定してください')
      return
    }

    setIsLoading(true)

    try {
      // クエリパラメータを構築
      const params = new URLSearchParams()
      params.append('format', format)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)

      const response = await fetch(`/api/export?${params.toString()}`)

      if (response.status === 404) {
        setMessage('エクスポート対象のデータが見つかりませんでした')
        return
      }

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました')
      }

      // Blobとしてデータを受信
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Content-Dispositionヘッダーからファイル名を取得
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `hibioru_export_${Date.now()}.${format === 'json' ? 'json' : 'md'}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // ダウンロード開始
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage('エクスポートが完了しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">データエクスポート</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-600 dark:bg-green-950 dark:border-green-800 dark:text-green-400 text-sm">
            {message}
          </div>
        )}

        {/* エクスポート形式選択 */}
        <div className="mb-6">
          <Label className="mb-2">エクスポート形式</Label>
          <RadioGroup
            value={format}
            onValueChange={(value) => setFormat(value as ExportFormat)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="json" id="format-json" />
              <Label htmlFor="format-json" className="font-normal cursor-pointer">JSON</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="markdown" id="format-markdown" />
              <Label htmlFor="format-markdown" className="font-normal cursor-pointer">Markdown</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 期間指定 */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from-date">開始日</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-date">終了日</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          期間を指定しない場合は、すべてのデータをエクスポートします
        </p>

        {/* エクスポートボタン */}
        <Button
          onClick={handleExport}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'エクスポート中...' : 'エクスポート'}
        </Button>
      </CardContent>
    </Card>
  )
}
