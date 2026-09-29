'use client'

import { motion } from 'motion/react'
import { ChevronRight, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/mock-data'
import { useStore } from './store'
import { StatusPill } from './primitives'

export function ScheduleTimeline({ tasks }: { tasks: Task[] }) {
  const { openTask } = useStore()
  return (
    <ol className="relative flex flex-col">
      {tasks.map((task, i) => {
        const last = i === tasks.length - 1
        const isBreak = task.kind === 'break'
        const current = task.status === 'in-progress'
        return (
          <motion.li
            key={task.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[4.25rem_1.25rem_1fr] gap-x-3"
          >
            <p className={cn('pt-3 text-right text-xs tabular-nums', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {task.start}
            </p>
            <div className="flex flex-col items-center">
              <span className={cn('mt-3.5 flex size-3 items-center justify-center rounded-full border-2 bg-card',
                task.status === 'completed' && 'border-success bg-success',
                current && 'border-ember',
                task.status === 'upcoming' && 'border-muted-foreground/50',
                task.status === 'carried' && 'border-warning bg-warning',
                isBreak && 'border-dashed border-muted-foreground/40',
              )}>
                {current && <span className="size-1 rounded-full bg-ember" />}
              </span>
              {!last && <span className={cn('mt-1 w-px flex-1', isBreak ? 'border-l border-dashed border-border' : 'bg-border')} />}
            </div>
            <div className="pb-2.5">
              {isBreak ? (
                <div className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground">
                  <Coffee className="size-4" aria-hidden="true" />
                  <span className="eyebrow">Break</span>
                  <span className="text-xs">{`until ${task.end}`}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openTask(task.id)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    current ? 'border-ember/40 bg-card shadow-sm' : 'border-transparent hover:border-border hover:bg-card',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn('truncate text-sm', task.status === 'completed' ? 'text-muted-foreground' : 'font-medium')}>
                      <span className="text-muted-foreground">{task.track}</span>
                      {' — '}
                      <span className={cn(task.status === 'completed' && 'line-through decoration-muted-foreground/40')}>{task.title}</span>
                    </span>
                    <span className="flex">
                      <StatusPill status={task.status} />
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
