'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FeatureCard } from '@/components/ui/feature-card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DatePickerWithInput } from '@/components/ui/date-picker-with-input'
import { useExport } from '@/features/mypage/hooks/use-export'

type ExportFormat = 'json' | 'markdown'

export function ExportSection() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)

  // エクスポート処理をフックに委譲
  const { isLoading, error, message, exportData } = useExport({
    format: exportFormat,
    fromDate,
    toDate,
  })

  // 日付範囲のバリデーション
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? '開始日より後の日付を指定してください'
      : undefined

  // エクスポート実行
  const handleExport = () => {
    if (dateRangeError) return
    exportData()
  }

  return (
    <FeatureCard title="データエクスポート" titleSize="xl">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* エクスポート形式選択 */}
      <div className="mb-6">
        <Label className="mb-2">エクスポート形式</Label>
        <RadioGroup
          value={exportFormat}
          onValueChange={(value) => setExportFormat(value as ExportFormat)}
          aria-label="エクスポート形式を選択"
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="json" id="format-json" />
            <Label htmlFor="format-json" className="font-normal cursor-pointer">
              JSON
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="markdown" id="format-markdown" />
            <Label htmlFor="format-markdown" className="font-normal cursor-pointer">
              Markdown
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* 期間指定 */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from-date">開始日</Label>
          <DatePickerWithInput
            id="from-date"
            date={fromDate}
            onDateChange={setFromDate}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-date">終了日</Label>
          <DatePickerWithInput
            id="to-date"
            date={toDate}
            onDateChange={setToDate}
            disabled={isLoading}
            error={dateRangeError}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        期間を指定しない場合は、すべてのデータをエクスポートします
      </p>

      {/* エクスポートボタン */}
      <Button
        onClick={handleExport}
        disabled={isLoading || !!dateRangeError}
        className="w-full"
      >
        {isLoading ? 'エクスポート中...' : 'エクスポート'}
      </Button>
    </FeatureCard>
  )
}
