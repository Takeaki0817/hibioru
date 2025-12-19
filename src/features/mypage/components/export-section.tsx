'use client'

import { useState } from 'react'
import { format, parse, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type ExportFormat = 'json' | 'markdown'

// 日付フォーマット（YYYY/MM/DD形式）
function formatDateString(date: Date | undefined): string {
  if (!date) return ''
  return format(date, 'yyyy/MM/dd')
}

// 日付の妥当性チェック（存在する日付かどうか）
function isValidDateString(value: string): boolean {
  if (value.length !== 10) return false
  const parsed = parse(value, 'yyyy/MM/dd', new Date())
  if (!isValid(parsed)) return false
  // パース後の日付が入力と一致するかチェック（2024/02/30などを検出）
  return format(parsed, 'yyyy/MM/dd') === value
}

// 日付ピッカーコンポーネント（Picker with Inputパターン）
function DatePickerWithInput({
  id,
  date,
  onDateChange,
  disabled,
  error,
}: {
  id: string
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  disabled?: boolean
  error?: string
}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date | undefined>(date)
  const [value, setValue] = useState(formatDateString(date))
  const [inputError, setInputError] = useState<string | null>(null)

  // Input変更時の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setValue(inputValue)
    setInputError(null)

    if (inputValue === '') {
      onDateChange(undefined)
      return
    }

    // YYYY/MM/DD形式で有効な日付ならDateオブジェクトを更新
    if (inputValue.length === 10) {
      if (isValidDateString(inputValue)) {
        const parsed = parse(inputValue, 'yyyy/MM/dd', new Date())
        onDateChange(parsed)
        setMonth(parsed)
      } else {
        setInputError('存在しない日付です')
        onDateChange(undefined)
      }
    } else if (inputValue.length > 0) {
      onDateChange(undefined)
    }
  }

  const displayError = inputError || error

  return (
    <div className="space-y-1">
      <div className="relative flex gap-2">
        <Input
          id={id}
          type="text"
          placeholder="YYYY/MM/DD"
          value={value}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
            }
          }}
          disabled={disabled}
          className={`bg-background pr-10 ${displayError ? 'border-destructive' : ''}`}
        />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            disabled={disabled}
            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
          >
            <CalendarIcon className="size-3.5" />
            <span className="sr-only">カレンダーを開く</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
        >
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate)
              setValue(formatDateString(selectedDate))
              setOpen(false)
            }}
            formatters={{
              formatMonthDropdown: (date) =>
                String(date.getMonth() + 1).padStart(2, '0'),
            }}
            classNames={{
              dropdowns: 'flex flex-row-reverse items-center gap-1.5',
            }}
          />
        </PopoverContent>
      </Popover>
      </div>
      {displayError && (
        <p className="text-destructive text-xs">{displayError}</p>
      )}
    </div>
  )
}

export function ExportSection() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 日付範囲のバリデーション
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? '開始日より後の日付を指定してください'
      : undefined

  // エクスポート実行
  const handleExport = async () => {
    setError(null)
    setMessage(null)

    // 日付範囲の妥当性チェック
    if (dateRangeError) {
      return
    }

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
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">データエクスポート</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
