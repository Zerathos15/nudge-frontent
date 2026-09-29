import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { USER, TODAY_ISO } from '@/lib/mock-data'
import { formatLong, weekday } from '@/lib/schedule'
import { Achievements } from '@/components/nudge/dashboard/achievements'
import { CurrentFocus } from '@/components/nudge/dashboard/current-focus'
import { DaySummary } from '@/components/nudge/dashboard/day-summary'
import { MasteryChart } from '@/components/nudge/dashboard/mastery-chart'
import { TodaySchedulePanel } from '@/components/nudge/dashboard/today-schedule-panel'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex flex-col gap-1 border-b border-border pb-6">
        <p className="eyebrow text-muted-foreground">
          {weekday(TODAY_ISO)} · {formatLong(TODAY_ISO)}
        </p>
        <h1 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
          Good afternoon, <span className="italic">{USER.firstName}.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Keep moving forward.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <CurrentFocus />
          <TodaySchedulePanel />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <DaySummary />
          <Achievements />
        </div>
      </div>

      <MasteryChart />

      <Link
        href="/progress"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        See all progress <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
