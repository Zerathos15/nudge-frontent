'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ArrowDown, Check, Circle, Clock, FileCheck2, GraduationCap, Hourglass, Lock, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HistoryEntry, Task } from '@/lib/mock-data'
import { formatShort } from '@/lib/schedule'
import { useStore } from './store'
import { Sheet, CloseButton } from './overlay'
import { Breadcrumbs, Button, DrawnCheck, Eyebrow, StatusPill } from './primitives'
import { EvidenceAiLabel, NotesUpload } from './notes-upload'

export function TaskDrawer() {
  const { openTaskId, openTask, tasks } = useStore()
  const task = tasks.find((t) => t.id === openTaskId && t.kind === 'study')
  return (
    <Sheet open={Boolean(task)} onClose={() => openTask(null)} label={task ? `${task.track} — ${task.title}` : 'Task'}>
      {task && <DrawerBody key={task.id} task={task} />}
    </Sheet>
  )
}

function DrawerBody({ task }: { task: Task }) {
  const { openTask, completeTask, carryForward, openMastery } = useStore()
  const [celebrate, setCelebrate] = useState(false)
  const completed = task.status === 'completed'

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 pb-4 pt-3 md:pt-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Eyebrow>{task.track}</Eyebrow>
            <StatusPill status={task.status} />
          </div>
          <h2 className="font-serif text-2xl font-medium leading-tight">{task.title}</h2>
          <Breadcrumbs parts={[task.phase, task.module, task.topicIndex]} />
        </div>
        <CloseButton onClick={() => openTask(null)} />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence>
          {celebrate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-success/25 bg-success/8"
            >
              <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
                <motion.span
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [0.5, 1.12, 1] }}
                  transition={{ duration: 0.55 }}
                  className="flex size-12 items-center justify-center rounded-full bg-success text-background"
                >
                  <DrawnCheck className="size-6" strokeWidth={3} delay={0.2} />
                </motion.span>
                <p className="eyebrow text-sm text-success">Task completed</p>
                <ol className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Completion steps">
                  {['Uploaded', 'Validated', 'Completed'].map((s, i) => (
                    <motion.li
                      key={s}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.18 }}
                      className={cn('flex items-center gap-2', i === 2 && 'font-medium text-success')}
                    >
                      {i > 0 && <span aria-hidden="true">→</span>}
                      {i === 2 && <Check className="size-3" strokeWidth={3} />}
                      {s}
                    </motion.li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="px-5 py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <Detail label="Track" value={task.track} />
            <Detail label="Phase" value={task.phase} />
            <Detail label="Module" value={task.module} />
            <Detail label="Topic" value={`${task.topicIndex} · ${task.title}`} />
            <Detail label="Time" value={`${task.start} – ${task.end}`} />
            <div className="flex flex-col gap-1">
              <dt className="eyebrow text-muted-foreground">Status</dt>
              <dd>
                <StatusPill status={task.status} />
              </dd>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <dt className="eyebrow text-muted-foreground">Prerequisites</dt>
              <dd className="flex flex-wrap gap-1.5">
                {task.prerequisites.map((p) => (
                  <span
                    key={p.name}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs',
                      p.done ? 'border-border bg-card' : 'border-dashed border-input text-muted-foreground',
                    )}
                  >
                    {p.done ? <Check className="size-3 text-success" strokeWidth={3} /> : <Circle className="size-2.5" />}
                    {p.name}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-border px-5 py-5">
          <div className="flex items-center justify-between pb-1">
            <h3 className="eyebrow">Study notes</h3>
            <EvidenceAiLabel />
          </div>
          {completed && task.evidence ? (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-success/30 bg-success/5 p-3">
              <FileCheck2 className="size-5 text-success" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{task.evidence.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  Evidence valid · {task.evidence.detected.join(', ')}
                </p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{task.evidence.validatedAt}</span>
            </div>
          ) : (
            <>
              <p className="pb-4 text-sm text-muted-foreground text-pretty">
                Upload the notes created for this task. Valid notes complete the task automatically.
              </p>
              <NotesUpload
                task={task}
                onValid={(fileName, detected) => {
                  setCelebrate(true)
                  completeTask(task.id, fileName, detected)
                }}
              />
              <p className="pt-3 text-center text-xs text-muted-foreground">No study notes uploaded yet.</p>
            </>
          )}
        </section>

        <AnimatePresence>
          {completed && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: celebrate ? 0.5 : 0 }}
              className="border-t border-border px-5 py-5"
            >
              <h3 className="eyebrow pb-3">Study & mastery</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border bg-card p-3">
                  <Eyebrow>Study</Eyebrow>
                  <p className="flex items-center gap-1.5 pt-1.5 text-sm font-medium text-success">
                    <Check className="size-4" strokeWidth={3} /> Completed
                  </p>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <Eyebrow>Mastery</Eyebrow>
                  <MasteryLabel state={task.mastery} />
                </div>
              </div>
              {(task.mastery === 'pending' || task.mastery === 'failed') && (
                <Button variant="ember" size="lg" className="mt-3 w-full" onClick={() => openMastery(task.id)}>
                  {task.mastery === 'failed' ? <RotateCcw /> : <GraduationCap />}
                  {task.mastery === 'failed' ? 'Retry Mastery' : 'Start Mastery'}
                </Button>
              )}
              <p className="pt-2 text-xs text-muted-foreground text-pretty">
                Completing notes doesn’t equal mastery. A short check confirms you can explain and apply it.
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="border-t border-border px-5 py-5">
          <h3 className="eyebrow pb-4">Task history</h3>
          <HistoryTimeline history={task.history} />
        </section>

        {!completed && (
          <section className="border-t border-dashed border-border px-5 pb-8 pt-4">
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Hourglass className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="text-pretty">
                {'If valid notes aren’t uploaded by '}
                {task.end}
                {', this task carries forward to the next day automatically.'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => carryForward(task.id)}
              className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Prototype: simulate the deadline passing
            </button>
          </section>
        )}
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function MasteryLabel({ state }: { state: Task['mastery'] }) {
  if (state === 'mastered')
    return (
      <p className="flex items-center gap-1.5 pt-1.5 text-sm font-medium text-success">
        <Check className="size-4" strokeWidth={3} /> Mastered
      </p>
    )
  if (state === 'failed')
    return <p className="pt-1.5 text-sm font-medium text-destructive">Needs reinforcement</p>
  if (state === 'locked')
    return (
      <p className="flex items-center gap-1.5 pt-1.5 text-sm text-muted-foreground">
        <Lock className="size-3.5" /> Locked
      </p>
    )
  return (
    <p className="flex items-center gap-1.5 pt-1.5 text-sm font-medium text-warning">
      <Clock className="size-3.5" /> Pending
    </p>
  )
}

export function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ol className="flex flex-col">
      <AnimatePresence initial={false}>
        {history.map((h, i) => {
          const last = i === history.length - 1
          const done = h.outcome === 'completed'
          const missed = h.outcome === 'not-completed'
          return (
            <motion.li
              key={`${h.date}-${h.label}-${i}`}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="flex gap-3"
            >
              <div className="flex w-14 shrink-0 flex-col pt-0.5">
                <span className="font-serif text-sm tabular-nums">{formatShort(h.date)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border-2',
                    done && 'border-success bg-success text-background',
                    missed && 'border-muted-foreground/40 bg-card',
                    h.outcome === 'open' && (h.label === 'Carried Forward' ? 'border-warning bg-warning/15' : 'border-foreground bg-card'),
                  )}
                >
                  {done && <DrawnCheck className="size-3" strokeWidth={3.5} />}
                </span>
                {!last && (
                  <span className="flex flex-1 flex-col items-center py-1 text-muted-foreground/60" aria-hidden="true">
                    <span className="w-px flex-1 bg-border" />
                    <ArrowDown className="size-3" />
                  </span>
                )}
              </div>
              <div className={cn('flex flex-col gap-0.5', !last && 'pb-5')}>
                <p className={cn('text-sm font-medium', done && 'text-success', h.label === 'Carried Forward' && 'text-warning')}>
                  {h.label === 'Completed' ? '✓ Completed' : h.label}
                </p>
                {h.label !== 'Completed' && (
                  <p className="text-xs text-muted-foreground">
                    {missed ? '○ Not completed' : h.outcome === 'open' ? 'Awaiting notes' : ''}
                  </p>
                )}
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ol>
  )
}
