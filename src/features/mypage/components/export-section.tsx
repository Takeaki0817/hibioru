'use client'

import { useState } from 'react'

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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">データエクスポート</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
          {message}
        </div>
      )}

      {/* エクスポート形式選択 */}
      <div className="mb-6">
        <label className="block font-medium mb-2">エクスポート形式</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="mr-2"
            />
            <span>JSON</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="format"
              value="markdown"
              checked={format === 'markdown'}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="mr-2"
            />
            <span>Markdown</span>
          </label>
        </div>
      </div>

      {/* 期間指定 */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="from-date" className="block font-medium mb-2">
            開始日
          </label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={isLoading}
            className="
              block w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>
        <div>
          <label htmlFor="to-date" className="block font-medium mb-2">
            終了日
          </label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            disabled={isLoading}
            className="
              block w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        期間を指定しない場合は、すべてのデータをエクスポートします
      </p>

      {/* エクスポートボタン */}
      <button
        onClick={handleExport}
        disabled={isLoading}
        className="
          w-full px-4 py-2 bg-orange-500 text-white font-medium rounded-md
          hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        {isLoading ? 'エクスポート中...' : 'エクスポート'}
      </button>
    </div>
  )
}
