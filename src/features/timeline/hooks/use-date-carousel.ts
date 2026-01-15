'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, addDays, differenceInDays, startOfDay, isToday } from 'date-fns'
import type { CarouselApi } from '@/components/ui/carousel'

// ウィンドウサイズ（前後の日数）
const WINDOW_DAYS = 15
const TOTAL_DAYS = WINDOW_DAYS * 2 + 1 // 31日分
const CENTER_INDEX = WINDOW_DAYS // 15

interface UseDateCarouselProps {
  currentDate: Date
  // 投稿がある日付（全期間、スキップ判定用）
  entryDates?: Set<string>
  onDateChange?: (date: Date) => void
  externalDateChangeRef?: React.MutableRefObject<((date: Date) => void) | null>
}

interface UseDateCarouselReturn {
  api: CarouselApi | undefined
  setApi: (api: CarouselApi) => void
  dates: Date[]
  selectedIndex: number
  isDateActive: (date: Date) => boolean
  handleDateClick: (index: number) => void
  centerIndex: number
}

/**
 * 日付カルーセルのロジックを管理するフック
 */
export function useDateCarousel({
  currentDate,
  entryDates,
  onDateChange,
  externalDateChangeRef,
}: UseDateCarouselProps): UseDateCarouselReturn {
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

  // 今日の日付文字列（YYYY-MM-DD）
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // entryDatesの最小・最大日付を取得（投稿がある日付の範囲）
  const { minDate, maxDate } = useMemo(() => {
    if (!entryDates || entryDates.size === 0) {
      // entryDatesがない場合は今日のみ
      return { minDate: todayStr, maxDate: todayStr }
    }
    // 今日も含めてソート
    const allDates = new Set(entryDates)
    allDates.add(todayStr)
    const sortedDates = Array.from(allDates).sort()
    return {
      minDate: sortedDates[0],
      maxDate: sortedDates[sortedDates.length - 1],
    }
  }, [entryDates, todayStr])

  // 日付がアクティブかどうかチェック（投稿有無 または 今日）
  const isDateActive = useCallback(
    (date: Date) => {
      // 今日は常にアクティブ（投稿がなくても空セクションを表示するため）
      if (isToday(date)) return true
      // entryDatesが空の場合は今日のみアクティブ（過去日付への移動を防止）
      if (!entryDates || entryDates.size === 0) return false
      return entryDates.has(format(date, 'yyyy-MM-dd'))
    },
    [entryDates]
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
          return null
        }
        if (maxDate && dateKey > maxDate && direction === 'forward') {
          return null
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
    api.scrollTo(CENTER_INDEX, true)
    isInitialized.current = true
  }, [api])

  // activeDatesが取得されたら最新日付（maxDate）に移動
  // 注意: 初期化時は onDateChange を呼ばない（TimelineList のスクロール検出を優先）
  // レンダー中の状態調整パターン + スクロール副作用の分離
  const [prevMaxDateForInit, setPrevMaxDateForInit] = useState<string | null>(null)
  const [pendingScroll, setPendingScroll] = useState<{
    index: number
    resetWindow: boolean
  } | null>(null)

  // レンダー中の状態調整（setState のみ、ref 操作は effect へ）
  if (api && maxDate && maxDate !== prevMaxDateForInit) {
    setPrevMaxDateForInit(maxDate)
    const maxDateObj = new Date(maxDate)

    const diff = differenceInDays(startOfDay(maxDateObj), startOfDay(windowCenter))
    if (Math.abs(diff) <= WINDOW_DAYS) {
      const targetIndex = CENTER_INDEX + diff
      setSelectedIndex(targetIndex)
      setPendingScroll({ index: targetIndex, resetWindow: false })
    } else {
      setWindowCenter(maxDateObj)
      setSelectedIndex(CENTER_INDEX)
      setPendingScroll({ index: CENTER_INDEX, resetWindow: true })
    }
  }

  // スクロール副作用とref更新（外部システムとの同期）
  // pendingScroll変更のみをトリガーとして処理
  const [processedScroll, setProcessedScroll] = useState<typeof pendingScroll>(null)

  useEffect(() => {
    if (!api || !pendingScroll || pendingScroll === processedScroll) return

    const { index, resetWindow } = pendingScroll

    // ref の更新は effect 内で行う
    hasInitializedToMaxDate.current = true
    prevIndexRef.current = index

    if (resetWindow) {
      isInitialized.current = false
      requestAnimationFrame(() => {
        api.scrollTo(index, true)
        // 非同期コールバック内でstate更新
        setProcessedScroll(pendingScroll)
      })
    } else {
      api.scrollTo(index, true)
      // 非同期コールバック内でstate更新
      queueMicrotask(() => setProcessedScroll(pendingScroll))
    }
  }, [api, pendingScroll, processedScroll])

  // 外部からの日付変更を受け付ける関数を公開
  useEffect(() => {
    if (!externalDateChangeRef) return

    externalDateChangeRef.current = (date: Date) => {
      if (!api) return
      isExternalUpdate.current = true

      // startOfDayで正規化してタイムゾーン問題を回避
      const diff = differenceInDays(startOfDay(date), startOfDay(windowCenter))
      if (Math.abs(diff) <= WINDOW_DAYS) {
        const targetIndex = CENTER_INDEX + diff
        api.scrollTo(targetIndex, true)
        setSelectedIndex(targetIndex)
        prevIndexRef.current = targetIndex
      } else {
        setWindowCenter(date)
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

    if (isExternalUpdate.current) {
      setSelectedIndex(index)
      prevIndexRef.current = index
      return
    }

    const selectedDate = dates[index]
    const dateKey = format(selectedDate, 'yyyy-MM-dd')

    // 範囲外チェック - 未読み込みデータへのアクセス時は読み込み済みの最古日付に戻す
    if (minDate && dateKey < minDate) {
      isSkipping.current = true

      // ウィンドウ内で最初のアクティブな日付を探す（読み込み済みの最古日付）
      let targetIndex = -1
      for (let i = 0; i < dates.length; i++) {
        if (isDateActive(dates[i])) {
          targetIndex = i
          break
        }
      }

      if (targetIndex >= 0) {
        api.scrollTo(targetIndex)
        setSelectedIndex(targetIndex)
        prevIndexRef.current = targetIndex
        // 移動先を通知（先読みトリガー）
        onDateChange?.(dates[targetIndex])
      }

      requestAnimationFrame(() => {
        isSkipping.current = false
      })
      return
    }
    if (maxDate && dateKey > maxDate) {
      // 未来方向への移動 → maxDate の位置に戻す
      isSkipping.current = true
      const maxIndex = dates.findIndex((d) => format(d, 'yyyy-MM-dd') === maxDate)
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

    // 端に近づいたらウィンドウをシフトして中央に再センタリング
    if (index < 5 || index > TOTAL_DAYS - 6) {
      setWindowCenter(selectedDate)
      isInitialized.current = false
      requestAnimationFrame(() => {
        api.scrollTo(CENTER_INDEX, true)
        setSelectedIndex(CENTER_INDEX)
        prevIndexRef.current = CENTER_INDEX
      })
    }

    onDateChange?.(selectedDate)
  }, [api, dates, minDate, maxDate, isDateActive, findNextActiveIndex, onDateChange])

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

  return {
    api,
    setApi,
    dates,
    selectedIndex,
    isDateActive,
    handleDateClick,
    centerIndex: CENTER_INDEX,
  }
}
