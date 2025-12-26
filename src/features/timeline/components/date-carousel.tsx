'use client'

import { format, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

interface DateCarouselProps {
  dates: Date[]
  selectedIndex: number
  // 投稿がある日付（全期間、スキップ判定・視覚表示用）
  entryDates?: Set<string>
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
          {dates.map((date, index) => {
            const day = date.getDate()
            const isCenter = index === selectedIndex
            const dateKey = format(date, 'yyyy-MM-dd')
            // 今日は常にアクティブ、または投稿がある日付
            const isTodayDate = isToday(date)
            const hasRecord = entryDates?.has(dateKey)
            const isActive = isTodayDate || !entryDates || entryDates.size === 0 || hasRecord
            const hasHotsure = hotsureDates?.has(dateKey)

            return (
              <CarouselItem key={dateKey} className="basis-1/5 pl-1">
                <button
                  onClick={() => onDateClick(index)}
                  className={cn(
                    'relative w-full rounded-lg px-1 py-1 text-center transition-all',
                    isCenter
                      ? 'text-xl font-bold text-white'
                      : isActive
                        ? 'text-sm text-muted-foreground hover:text-foreground'
                        : 'cursor-not-allowed text-sm text-muted-foreground/40'
                  )}
                  aria-label={format(date, 'M月d日', { locale: ja })}
                >
                  <span className="flex items-center justify-center gap-0.5">
                    {day}
                    {/* ほつれ使用日の糸マーク（中央の選択中日付のみ） */}
                    {isCenter && hasHotsure && (
                      <span className="text-xs" aria-label="ほつれ使用日">🧵</span>
                    )}
                  </span>
                  {/* 記録ありドットインジケーター */}
                  {!isCenter && hasRecord && (
                    <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-300" />
                  )}
                </button>
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>
    </div>
  )
}
