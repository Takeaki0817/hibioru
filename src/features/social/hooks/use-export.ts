'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'

type ExportFormat = 'json' | 'markdown'

interface UseExportOptions {
  format: ExportFormat
  fromDate?: Date
  toDate?: Date
}

interface UseExportReturn {
  isLoading: boolean
  error: string | null
  message: string | null
  exportData: () => Promise<void>
}

/**
 * データエクスポート処理を行うフック
 */
export function useExport({
  format: exportFormat,
  fromDate,
  toDate,
}: UseExportOptions): UseExportReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const exportData = useCallback(async () => {
    setError(null)
    setMessage(null)
    setIsLoading(true)

    try {
      // クエリパラメータを構築
      const params = new URLSearchParams()
      params.append('format', exportFormat)
      if (fromDate) params.append('from', format(fromDate, 'yyyy-MM-dd'))
      if (toDate) params.append('to', format(toDate, 'yyyy-MM-dd'))

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
      let filename = `hibioru_export_${Date.now()}.${exportFormat === 'json' ? 'json' : 'md'}`
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
  }, [exportFormat, fromDate, toDate])

  return {
    isLoading,
    error,
    message,
    exportData,
  }
}
