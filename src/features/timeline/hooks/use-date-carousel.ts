'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import type { CarouselApi } from '@/components/ui/carousel'

// ウィンドウサイズ（前後の日数）
const WINDOW_DAYS = 15
const TOTAL_DAYS = WINDOW_DAYS * 2 + 1 // 31日分
const CENTER_INDEX = WINDOW_DAYS // 15

interface UseDateCarouselProps {
  currentDate: Date
  activeDates?: Set<string>
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
  activeDates,
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
  useEffect(() => {
    if (!api || !maxDate || hasInitializedToMaxDate.current) return

    hasInitializedToMaxDate.current = true
    const maxDateObj = new Date(maxDate)

    const diff = differenceInDays(maxDateObj, windowCenter)
    if (Math.abs(diff) <= WINDOW_DAYS) {
      const targetIndex = CENTER_INDEX + diff
      api.scrollTo(targetIndex, true)
      setSelectedIndex(targetIndex)
      prevIndexRef.current = targetIndex
      onDateChange?.(maxDateObj)
    } else {
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

      const diff = differenceInDays(date, windowCenter)
      if (Math.abs(diff) <= WINDOW_DAYS) {
        api.scrollTo(CENTER_INDEX + diff, true)
        setSelectedIndex(CENTER_INDEX + diff)
        prevIndexRef.current = CENTER_INDEX + diff
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

    // 範囲外チェック
    if (minDate && dateKey < minDate) {
      isSkipping.current = true
      const minIndex = dates.findIndex((d) => format(d, 'yyyy-MM-dd') === minDate)
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
