'use client'

import { memo, useCallback, useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Spool } from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

interface DateCarouselItemProps {
  date: Date
  index: number
  selectedIndex: number
  entryDates?: Set<string>
  hotsureDates?: Set<string>
  onDateClick: (index: number) => void
}

/**
 * 個別の日付アイテム（メモ化）
 */
const DateCarouselItemComponent = memo(function DateCarouselItemComponent({
  date,
  index,
  selectedIndex,
  entryDates,
  hotsureDates,
  onDateClick,
}: DateCarouselItemProps) {
  const dateKey = useMemo(() => format(date, 'yyyy-MM-dd'), [date])
  const day = date.getDate()
  const isCenter = index === selectedIndex
  const isTodayDate = isToday(date)
  const hasRecord = entryDates?.has(dateKey)
  const hasHotsure = hotsureDates?.has(dateKey)
  const isActive = isTodayDate || !entryDates || entryDates.size === 0 || hasRecord

  const handleClick = useCallback(() => onDateClick(index), [onDateClick, index])
  const ariaLabel = useMemo(() => format(date, 'M月d日', { locale: ja }), [date])

  return (
    <CarouselItem className="basis-1/5 pl-1">
      <button
        onClick={handleClick}
        className={cn(
          'relative w-full rounded-lg px-1 py-1 text-center transition-all',
          isCenter
            ? 'text-xl font-bold text-white'
            : isActive
              ? 'text-sm text-muted-foreground hover:text-foreground'
              : 'cursor-not-allowed text-sm text-muted-foreground/40'
        )}
        aria-label={ariaLabel}
      >
        <span className="flex items-center justify-center gap-0.5">
          {day}
        </span>
        {/* ほつれアイコン */}
        {hasHotsure && (
          <Spool className="absolute -right-0.5 -top-0.5 h-3 w-3 text-primary-400" />
        )}
        {/* 記録ありドットインジケーター */}
        {!isCenter && hasRecord && (
          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-300" />
        )}
      </button>
    </CarouselItem>
  )
})

interface DateCarouselProps {
  dates: Date[]
  selectedIndex: number
  // 投稿がある日付（全期間、スキップ判定・視覚表示用）
  entryDates?: Set<string>
  // ほつれ使用日（アイコン表示用）
  hotsureDates?: Set<string>
  centerIndex: number
  setApi: (api: CarouselApi) => void
  onDateClick: (index: number) => void
}

/**
 * 日付カルーセルUIコンポーネント
 */
export function DateCarousel({
  dates,
  selectedIndex,
  entryDates,
  hotsureDates,
  centerIndex,
  setApi,
  onDateClick,
}: DateCarouselProps) {
  return (
    <div className="relative flex h-10 w-45 items-center">
      {/* 中央の固定マーカー（Sage Green） */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-9 rounded-lg bg-primary-400 dark:bg-primary-500" />
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: 'center',
          containScroll: false,
          startIndex: centerIndex,
          duration: 25,
          dragFree: false,
          watchDrag: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-1 items-center">
          {dates.map((date, index) => (
            <DateCarouselItemComponent
              key={format(date, 'yyyy-MM-dd')}
              date={date}
              index={index}
              selectedIndex={selectedIndex}
              entryDates={entryDates}
              hotsureDates={hotsureDates}
              onDateClick={onDateClick}
            />
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )
}
