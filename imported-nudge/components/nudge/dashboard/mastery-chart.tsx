'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { MASTERY_SERIES, MASTERY_TARGET, type MasteryPoint } from '@/lib/mock-data'
import { Eyebrow, Panel } from '../primitives'
import { useStore } from '../store'

function ChartTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as MasteryPoint
  return (
    <div className="min-w-44 rounded-md border border-border bg-popover p-3 text-xs shadow-lg">
      <p className="pb-2 font-serif text-sm">
        {p.date} · {p.day}
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Mastery Score</dt>
        <dd className="text-right font-medium tabular-nums">{p.score}%</dd>
        <dt className="text-muted-foreground">Evaluations</dt>
        <dd className="text-right tabular-nums">{p.evaluations}</dd>
        <dt className="text-muted-foreground">Passed</dt>
        <dd className="text-right tabular-nums">{p.passed}</dd>
        <dt className="text-muted-foreground">Mastered Topics</dt>
        <dd className="text-right tabular-nums">{p.mastered}</dd>
      </dl>
    </div>
  )
}

export function MasteryChart() {
  const { masteredToday } = useStore()
  const data = MASTERY_SERIES.map((p, i) =>
    i === MASTERY_SERIES.length - 1 && masteredToday
      ? {
          ...p,
          evaluations: p.evaluations + masteredToday,
          passed: p.passed + masteredToday,
          mastered: p.mastered + masteredToday,
          score: Math.min(100, p.score + masteredToday * 2),
        }
      : p,
  )
  const latest = data.at(-1)!.score
  const peak = Math.max(...data.map((d) => d.score))

  return (
    <Panel className="flex flex-col gap-5 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Daily mastery</Eyebrow>
          <p className="pt-1 text-sm text-muted-foreground">Last 7 days · rolling</p>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-paper">
          {[
            { label: 'Latest score', value: `${latest}%` },
            { label: '7-day peak', value: `${peak}%` },
            { label: 'Target', value: `≥ ${MASTERY_TARGET}%` },
          ].map((m) => (
            <div key={m.label} className="flex flex-col gap-0.5 px-3 py-2 sm:px-4">
              <dt className="eyebrow text-[0.58rem] text-muted-foreground">{m.label}</dt>
              <dd className="font-serif text-lg font-medium tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="h-56 w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickMargin={10}
            />
            <YAxis
              domain={[60, 100]}
              ticks={[60, 70, 80, 90, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine
              y={MASTERY_TARGET}
              stroke="var(--success)"
              strokeDasharray="4 4"
              label={{ value: 'Target', position: 'insideTopRight', fontSize: 10, fill: 'var(--success)' }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--card)', stroke: 'var(--foreground)', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: 'var(--ember)', stroke: 'var(--card)', strokeWidth: 2 }}
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
