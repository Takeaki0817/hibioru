'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

// ウィンドウサイズ（前後の日数）
const WINDOW_DAYS = 15
const TOTAL_DAYS = WINDOW_DAYS * 2 + 1 // 31日分
const CENTER_INDEX = WINDOW_DAYS // 15

export interface DateHeaderProps {
  currentDate: Date
  activeDates?: Set<string> // 記録がある日付（YYYY-MM-DD形式）
  onDateChange?: (date: Date) => void
  onToggleCalendar?: () => void
  // 外部からの日付変更を受け付けるref
  externalDateChangeRef?: React.MutableRefObject<((date: Date) => void) | null>
}

export function DateHeader({
  currentDate,
  activeDates,
  onDateChange,
  onToggleCalendar,
  externalDateChangeRef,
}: DateHeaderProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [windowCenter, setWindowCenter] = useState(currentDate)
  const [selectedIndex, setSelectedIndex] = useState(CENTER_INDEX)
  const isExternalUpdate = useRef(false)
  const isInitialized = useRef(false)
  const prevIndexRef = useRef(CENTER_INDEX)
  const isSkipping = useRef(false)
  const hasInitializedToMaxDate = useRef(false)

  // ウィンドウの日付配列を生成
  const dates = useMemo(() => {
    const result: Date[] = []
    for (let i = -WINDOW_DAYS; i <= WINDOW_DAYS; i++) {
      result.push(addDays(windowCenter, i))
    }
    return result
  }, [windowCenter])

  // activeDatesの最小・最大日付を取得
  const { minDate, maxDate } = useMemo(() => {
    if (!activeDates || activeDates.size === 0) {
      return { minDate: null, maxDate: null }
    }
    const sortedDates = Array.from(activeDates).sort()
    return {
      minDate: sortedDates[0],
      maxDate: sortedDates[sortedDates.length - 1],
    }
  }, [activeDates])

  const monthStr = format(currentDate, 'M月', { locale: ja })

  // 日付がアクティブかどうかチェック
  const isDateActive = useCallback(
    (date: Date) => {
      if (!activeDates || activeDates.size === 0) return true
      return activeDates.has(format(date, 'yyyy-MM-dd'))
    },
    [activeDates]
  )

  // 指定方向で次のアクティブなインデックスを探す
  const findNextActiveIndex = useCallback(
    (fromIndex: number, direction: 'forward' | 'backward') => {
      const step = direction === 'forward' ? 1 : -1
      let index = fromIndex + step

      while (index >= 0 && index < dates.length) {
        const date = dates[index]
        const dateKey = format(date, 'yyyy-MM-dd')

        // 範囲外チェック
        if (minDate && dateKey < minDate && direction === 'backward') {
          return null // これ以上戻れない
        }
        if (maxDate && dateKey > maxDate && direction === 'forward') {
          return null // これ以上進めない
        }

        if (isDateActive(date)) {
          return index
        }
        index += step
      }
      return null
    },
    [dates, minDate, maxDate, isDateActive]
  )

  // 初期化時に中央にスクロール
  useEffect(() => {
    if (!api || isInitialized.current) return
    api.scrollTo(CENTER_INDEX, true) // instant scroll
    isInitialized.current = true
  }, [api])

  // activeDatesが取得されたら最新日付（maxDate）に移動
  useEffect(() => {
    if (!api || !maxDate || hasInitializedToMaxDate.current) return

    hasInitializedToMaxDate.current = true
    const maxDateObj = new Date(maxDate)

    // ウィンドウの範囲内かチェック
    const diff = differenceInDays(maxDateObj, windowCenter)
    if (Math.abs(diff) <= WINDOW_DAYS) {
      // 範囲内なら該当インデックスに移動
      const targetIndex = CENTER_INDEX + diff
      api.scrollTo(targetIndex, true)
      setSelectedIndex(targetIndex)
      prevIndexRef.current = targetIndex
      onDateChange?.(maxDateObj)
    } else {
      // 範囲外ならウィンドウを再構築
      setWindowCenter(maxDateObj)
      isInitialized.current = false
      requestAnimationFrame(() => {
        api.scrollTo(CENTER_INDEX, true)
        setSelectedIndex(CENTER_INDEX)
        prevIndexRef.current = CENTER_INDEX
        onDateChange?.(maxDateObj)
      })
    }
  }, [api, maxDate, windowCenter, onDateChange])

  // 外部からの日付変更を受け付ける関数を公開
  useEffect(() => {
    if (!externalDateChangeRef) return

    externalDateChangeRef.current = (date: Date) => {
      if (!api) return
      isExternalUpdate.current = true

      // ウィンドウの範囲内かチェック
      const diff = differenceInDays(date, windowCenter)
      if (Math.abs(diff) <= WINDOW_DAYS) {
        // 範囲内なら該当インデックスに移動
        api.scrollTo(CENTER_INDEX + diff, true)
        setSelectedIndex(CENTER_INDEX + diff)
        prevIndexRef.current = CENTER_INDEX + diff
      } else {
        // 範囲外ならウィンドウを再構築
        setWindowCenter(date)
        // 次のフレームで中央に戻す
        requestAnimationFrame(() => {
          api.scrollTo(CENTER_INDEX, true)
          setSelectedIndex(CENTER_INDEX)
          prevIndexRef.current = CENTER_INDEX
        })
      }

      requestAnimationFrame(() => {
        isExternalUpdate.current = false
      })
    }

    return () => {
      if (externalDateChangeRef) {
        externalDateChangeRef.current = null
      }
    }
  }, [api, windowCenter, externalDateChangeRef])

  // カルーセルの選択変更を監視（スナップ完了時）
  const onSelect = useCallback(() => {
    if (!api || isSkipping.current) return

    const index = api.selectedScrollSnap()
    const prevIndex = prevIndexRef.current
    const direction = index > prevIndex ? 'forward' : 'backward'

    // 外部更新中は親に通知しない
    if (isExternalUpdate.current) {
      setSelectedIndex(index)
      prevIndexRef.current = index
      return
    }

    const selectedDate = dates[index]
    const dateKey = format(selectedDate, 'yyyy-MM-dd')

    // 範囲外チェック
    if (minDate && dateKey < minDate) {
      // 最小日付より前には行けない
      isSkipping.current = true
      const minIndex = dates.findIndex(
        (d) => format(d, 'yyyy-MM-dd') === minDate
      )
      if (minIndex >= 0) {
        api.scrollTo(minIndex)
        setSelectedIndex(minIndex)
        prevIndexRef.current = minIndex
      }
      requestAnimationFrame(() => {
        isSkipping.current = false
      })
      return
    }
    if (maxDate && dateKey > maxDate) {
      // 最大日付より後には行けない
      isSkipping.current = true
      const maxIndex = dates.findIndex(
        (d) => format(d, 'yyyy-MM-dd') === maxDate
      )
      if (maxIndex >= 0) {
        api.scrollTo(maxIndex)
        setSelectedIndex(maxIndex)
        prevIndexRef.current = maxIndex
      }
      requestAnimationFrame(() => {
        isSkipping.current = false
      })
      return
    }

    // 選択された日付がアクティブでない場合、次のアクティブな日付にスキップ
    if (!isDateActive(selectedDate)) {
      const nextActiveIndex = findNextActiveIndex(index, direction)
      if (nextActiveIndex !== null) {
        isSkipping.current = true
        api.scrollTo(nextActiveIndex)
        setSelectedIndex(nextActiveIndex)
        prevIndexRef.current = nextActiveIndex
        const nextDate = dates[nextActiveIndex]
        onDateChange?.(nextDate)
        requestAnimationFrame(() => {
          isSkipping.current = false
        })
      } else {
        // 次のアクティブがない場合、前の位置に戻る
        isSkipping.current = true
        api.scrollTo(prevIndex)
        setSelectedIndex(prevIndex)
        requestAnimationFrame(() => {
          isSkipping.current = false
        })
      }
      return
    }

    setSelectedIndex(index)
    prevIndexRef.current = index

    // 端に近づいたらウィンドウをシフト
    if (index < 5 || index > TOTAL_DAYS - 6) {
      setWindowCenter(selectedDate)
      isInitialized.current = false // 再初期化フラグ
    }

    onDateChange?.(selectedDate)
  }, [
    api,
    dates,
    minDate,
    maxDate,
    isDateActive,
    findNextActiveIndex,
    onDateChange,
  ])

  useEffect(() => {
    if (!api) return

    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  // 日付タップでそのスライドに移動
  const handleDateClick = useCallback(
    (index: number) => {
      const date = dates[index]
      if (isDateActive(date)) {
        api?.scrollTo(index)
      }
    },
    [api, dates, isDateActive]
  )

  return (
    <header className="sticky top-0 z-10 flex h-[80px] items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* 左: ロゴ */}
      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
        ヒビオル
      </span>

      {/* 中央: カルーセル日付 */}
      <div className="relative w-[180px]">
        {/* 中央の固定マーカー */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-9 rounded bg-gray-900 dark:bg-gray-100" />
        </div>

        <Carousel
          setApi={setApi}
          opts={{
            align: 'center',
            containScroll: false,
            startIndex: CENTER_INDEX,
            duration: 25, // スムーススクロール
            dragFree: false, // スナップを有効化
            watchDrag: true, // ドラッグを有効化
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-1 items-center">
            {dates.map((date, index) => {
              const day = date.getDate()
              const isCenter = index === selectedIndex
              const dateKey = format(date, 'yyyy-MM-dd')
              const isActive = !activeDates || activeDates.has(dateKey)

              return (
                <CarouselItem key={dateKey} className="basis-1/5 pl-1">
                  <button
                    onClick={() => handleDateClick(index)}
                    className={cn(
                      'w-full rounded px-1 py-1 text-center transition-all',
                      isCenter
                        ? 'text-xl font-bold text-white dark:text-gray-900'
                        : isActive
                          ? 'text-sm text-gray-500 dark:text-gray-400'
                          : 'cursor-not-allowed text-sm text-gray-300 dark:text-gray-600'
                    )}
                    aria-label={format(date, 'M月d日', { locale: ja })}
                  >
                    {day}
                  </button>
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* 右: 月（カレンダーボタン） */}
      <button
        onClick={onToggleCalendar}
        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        aria-label="カレンダーを開く"
      >
        {monthStr}
      </button>
    </header>
  )
}
