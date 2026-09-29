'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { Topic } from '@/lib/mock-data'

/** A compact progression line: done · current · upcoming stops. */
export function CheckpointLine({ topics, window = 7 }: { topics: Topic[]; window?: number }) {
  const currentIndex = Math.max(0, topics.findIndex((t) => t.status === 'current'))
  const start = Math.max(0, Math.min(currentIndex - Math.floor(window / 2), topics.length - window))
  const visible = topics.slice(start, start + window)

  return (
    <ol className="flex items-start" aria-label="Topic progression">
      {visible.map((topic, i) => {
        const done = topic.status === 'done'
        const current = topic.status === 'current'
        return (
          <li key={topic.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || current ? 'bg-foreground' : 'bg-border')} />
              <motion.span
                layout
                className={cn(
                  'relative flex shrink-0 items-center justify-center rounded-full border-2',
                  current ? 'size-4 border-ember bg-card' : 'size-3',
                  done && 'border-foreground bg-foreground',
                  topic.status === 'todo' && 'border-border bg-card',
                )}
              >
                {current && <span className="size-1.5 rounded-full bg-ember" />}
                {current && <span className="absolute inset-[-5px] animate-ping rounded-full border border-ember/30" aria-hidden="true" />}
              </motion.span>
              <span className={cn('h-0.5 flex-1', i === visible.length - 1 ? 'bg-transparent' : done ? 'bg-foreground' : 'bg-border')} />
            </div>
            <span
              className={cn(
                'line-clamp-2 px-0.5 text-center text-[0.68rem] leading-tight',
                current ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {topic.name}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
