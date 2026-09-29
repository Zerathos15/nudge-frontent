'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Clock } from 'lucide-react'
import { useStore } from '../store'
import { Button, Eyebrow, Panel, StatusPill } from '../primitives'

export function CurrentFocus() {
  const { tasks, openTask } = useStore()
  const study = tasks.filter((t) => t.kind === 'study')
  const focus =
    study.find((t) => t.status === 'in-progress') ??
    study.find((t) => t.status === 'upcoming') ??
    study.find((t) => t.status === 'carried')

  return (
    <Panel className="relative overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-1 bg-ember" aria-hidden="true" />
      <AnimatePresence mode="wait">
        {focus ? (
          <motion.div
            key={focus.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-5 p-5 pl-6 md:p-6 md:pl-7"
          >
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>{focus.status === 'in-progress' ? 'Current focus' : 'Up next'}</Eyebrow>
              <StatusPill status={focus.status} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="eyebrow text-ember">{focus.track}</p>
              <h2 className="font-serif text-3xl font-medium tracking-tight md:text-4xl">{focus.title}</h2>
              <p className="text-sm text-muted-foreground">
                {focus.module} · {focus.topicIndex}
              </p>
            </div>
            <div className="flex flex-col gap-4 border-t border-dashed border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm tabular-nums">
                <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                {focus.start} – {focus.end}
              </p>
              <Button variant="primary" size="md" onClick={() => openTask(focus.id)}>
                Open Task <ArrowRight />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-2 p-6 pl-7"
          >
            <Eyebrow>Current focus</Eyebrow>
            <p className="font-serif text-3xl">{'You’re all caught up.'}</p>
            <p className="text-sm text-muted-foreground">Nothing else for today. See you tomorrow.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  )
}
