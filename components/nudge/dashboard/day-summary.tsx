'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Flame } from 'lucide-react'
import { CheckpointLine } from '../checkpoint-line'
import { Eyebrow, Panel, ProgressBar } from '../primitives'
import { useStore } from '../store'

function Counter({ value }: { value: number }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function DaySummary() {
  const { stats, streak, tracks } = useStore()
  const aiml = tracks.find((t) => t.id === 'aiml')!
  const done = aiml.flatTopics.filter((t) => t.status === 'done').length

  return (
    <Panel className="flex flex-col">
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="flex flex-col gap-1 p-5">
          <Eyebrow>Today</Eyebrow>
          <p className="font-serif text-3xl font-medium">
            <Counter value={stats.completedToday} />
            <span className="text-muted-foreground">/{stats.totalToday}</span>
          </p>
          <p className="text-xs text-muted-foreground">tasks completed</p>
        </div>
        <div className="flex flex-col gap-1 p-5">
          <Eyebrow>Streak</Eyebrow>
          <p className="flex items-center gap-1.5 font-serif text-3xl font-medium">
            <Counter value={streak} />
            <Flame className="size-5 text-ember" aria-hidden="true" />
          </p>
          <p className="text-xs text-muted-foreground">days in a row</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <Eyebrow>Checkpoint · {aiml.name}</Eyebrow>
          <Link href="/checkpoint" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View <ArrowRight className="size-3" />
          </Link>
        </div>
        <CheckpointLine topics={aiml.flatTopics} window={5} />
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {done} of {aiml.flatTopics.length} topics
            </span>
            <span className="font-medium tabular-nums">{aiml.liveProgress}%</span>
          </div>
          <ProgressBar value={aiml.liveProgress} tone="ember" label="AIML progress" />
        </div>
      </div>
    </Panel>
  )
}
