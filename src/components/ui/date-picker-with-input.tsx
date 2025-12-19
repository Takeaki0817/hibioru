'use client'

import { useState } from 'react'
import { format, parse, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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

interface DatePickerWithInputProps {
  id: string
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  disabled?: boolean
  error?: string
}

/**
 * 日付入力フィールド + カレンダーピッカー
 * YYYY/MM/DD形式での直接入力とカレンダーからの選択の両方に対応
 */
export function DatePickerWithInput({
  id,
  date,
  onDateChange,
  disabled,
  error,
}: DatePickerWithInputProps) {
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
