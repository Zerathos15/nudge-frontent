'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BookMarked, Check, Flame, Footprints, Layers, Lock, RotateCcw, CalendarCheck2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/lib/mock-data'
import { Eyebrow, Panel } from '../primitives'
import { useStore } from '../store'

const ICONS: Record<Achievement['icon'], typeof Flame> = {
  step: Footprints,
  streak: Flame,
  mastery: BookMarked,
  module: Layers,
  comeback: RotateCcw,
  week: CalendarCheck2,
}

function Badge({
  a,
  selected,
  onSelect,
}: {
  a: Achievement
  selected: boolean
  onSelect: () => void
}) {
  const Icon = ICONS[a.icon]
  const unlocked = Boolean(a.earned)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-md p-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'bg-accent' : 'hover:bg-accent/60',
      )}
    >
      <motion.span
        key={unlocked ? 'on' : 'off'}
        initial={unlocked ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: [0.6, 1.12, 1], opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'relative flex size-12 items-center justify-center rounded-full border-2',
          unlocked ? 'border-foreground bg-card text-foreground' : 'border-dashed border-border bg-transparent text-muted-foreground/50',
        )}
      >
        <span className={cn('absolute inset-1 rounded-full border', unlocked ? 'border-foreground/15' : 'border-transparent')} aria-hidden="true" />
        {unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
        {unlocked && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35, type: 'spring' }}
            className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-ember text-ember-foreground"
          >
            <Check className="size-2.5" strokeWidth={3.5} />
          </motion.span>
        )}
      </motion.span>
      <span className={cn('eyebrow text-[0.58rem] leading-tight', !unlocked && 'text-muted-foreground')}>{a.title}</span>
    </button>
  )
}

export function Achievements() {
  const { achievements, streak } = useStore()
  const [selected, setSelected] = useState('streak-50')
  const unlocked = achievements.filter((a) => a.earned).length
  const current = achievements.find((a) => a.id === selected)

  return (
    <Panel className="flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-end justify-between">
        <Eyebrow>Achievements</Eyebrow>
        <dl className="flex gap-4 text-right">
          <div>
            <dd className="font-serif text-lg font-medium tabular-nums">{unlocked}</dd>
            <dt className="text-[0.68rem] text-muted-foreground">Achievements</dt>
          </div>
          <div>
            <dd className="font-serif text-lg font-medium tabular-nums">{streak}</dd>
            <dt className="text-[0.68rem] text-muted-foreground">Longest streak</dt>
          </div>
        </dl>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {achievements.map((a) => (
          <Badge key={a.id} a={a} selected={selected === a.id} onSelect={() => setSelected(a.id)} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id + (current.earned ?? '')}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-md border border-dashed border-border bg-paper px-4 py-3"
          >
            <p className="eyebrow">{current.title}</p>
            <p className="pt-1 text-sm text-muted-foreground">{current.description}</p>
            <p className="pt-2 text-xs">
              {current.earned ? (
                <>
                  <span className="text-muted-foreground">Earned: </span>
                  <span className="font-medium">{current.earned === 'Sep 28' ? 'September 28' : current.earned}</span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Locked
                  {current.id === 'streak-50' && ` · ${50 - streak} day to go — complete a task today`}
                </span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  )
}
