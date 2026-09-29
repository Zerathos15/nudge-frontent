'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Eyebrow, Panel } from '../primitives'
import { ScheduleTimeline } from '../schedule-timeline'
import { useStore } from '../store'

export function TodaySchedulePanel() {
  const { tasks } = useStore()
  return (
    <Panel className="flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-center justify-between">
        <Eyebrow>{'Today’s schedule'}</Eyebrow>
        <Link href="/schedule" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Full schedule <ArrowRight className="size-3" />
        </Link>
      </div>
      <ScheduleTimeline tasks={tasks} />
    </Panel>
  )
}
