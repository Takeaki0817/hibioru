'use client'

import { useState } from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { DateHeader } from '@/components/timeline/DateHeader'
import { MonthCalendar } from '@/components/timeline/MonthCalendar'
import { TimelineList } from '@/components/timeline/TimelineList'
import { FooterNav } from '@/components/navigation/FooterNav'
import type { Entry } from '@/lib/types/database'

export interface TimelineClientProps {
  userId: string
  initialEntries: Entry[]
}

export function TimelineClient({ userId }: TimelineClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <QueryProvider>
      <div className="flex h-screen flex-col">
        <DateHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onToggleCalendar={() => setIsCalendarOpen(!isCalendarOpen)}
        />

        <div className="flex-1 overflow-hidden pb-20">
          <TimelineList userId={userId} />
        </div>

        <MonthCalendar
          userId={userId}
          isOpen={isCalendarOpen}
          selectedDate={currentDate}
          onSelectDate={setCurrentDate}
          onClose={() => setIsCalendarOpen(false)}
        />

        <FooterNav />
      </div>
    </QueryProvider>
  )
}
