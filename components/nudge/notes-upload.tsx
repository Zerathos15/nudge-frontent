'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, FileText, Loader2, ScanSearch, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/mock-data'
import { Button, DrawnCheck, Eyebrow } from './primitives'

type Scenario = 'valid' | 'insufficient' | 'invalid' | 'title-only' | 'unreadable'
type Phase = 'idle' | 'uploading' | 'reading' | 'checks' | 'ai' | 'result'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function detectScenario(name: string, size: number): Scenario {
  const n = name.toLowerCase()
  if (size === 0 || n.includes('corrupt')) return 'unreadable'
  if (n.includes('title') || size < 3000) return 'title-only'
  if (n.includes('database') || n.includes('unrelated') || n.includes('other')) return 'invalid'
  if (n.includes('draft') || n.includes('partial')) return 'insufficient'
  return 'valid'
}

export function EvidenceAiLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-success/30 bg-success/10 px-1.5 py-0.5 text-success">
      <ScanSearch className="size-3" aria-hidden="true" />
      <span className="eyebrow text-[0.6rem]">Evidence AI</span>
    </span>
  )
}

export function NotesUpload({
  task,
  onValid,
}: {
  task: Task
  onValid: (fileName: string, detected: string[]) => void
}) {
  const slug = task.title.replace(/\s+/g, '_')
  const [phase, setPhase] = useState<Phase>('idle')
  const [scenario, setScenario] = useState<Scenario>('valid')
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [checksDone, setChecksDone] = useState(0)
  const [rejection, setRejection] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const runId = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => void (runId.current += 1), [])

  const reset = () => {
    runId.current += 1
    setPhase('idle')
    setProgress(0)
    setChecksDone(0)
    setRejection(null)
  }

  const run = async (name: string, size: number) => {
    const id = ++runId.current
    const alive = () => runId.current === id
    const sc = detectScenario(name, size)
    setRejection(null)
    setFileName(name)
    setScenario(sc)
    setChecksDone(0)
    setPhase('uploading')
    for (let p = 0; p <= 100; p += 10) {
      if (!alive()) return
      setProgress(p)
      await sleep(90)
    }
    setPhase('reading')
    await sleep(750)
    if (!alive()) return
    if (sc === 'unreadable') {
      setPhase('result')
      return
    }
    setPhase('checks')
    for (let i = 1; i <= 4; i++) {
      await sleep(380)
      if (!alive()) return
      setChecksDone(i)
      if (sc === 'title-only' && i === 4) {
        await sleep(400)
        setPhase('result')
        return
      }
    }
    await sleep(300)
    if (!alive()) return
    setPhase('ai')
    await sleep(1900)
    if (!alive()) return
    setPhase('result')
    if (sc === 'valid') {
      await sleep(1500)
      if (!alive()) return
      onValid(name, task.concepts)
    }
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setRejection('PDF only. Please choose a .pdf file.')
      return
    }
    void run(file.name, file.size)
  }

  const samples = [
    { label: 'Complete notes', name: `${slug}_Notes.pdf`, size: 482_000 },
    { label: 'Partial notes', name: `${slug}_Draft.pdf`, size: 96_000 },
    { label: 'Title only', name: `${slug}_Title.pdf`, size: 1_200 },
    { label: 'Unrelated notes', name: 'Database_Normalization.pdf', size: 310_000 },
  ]

  if (phase === 'idle') {
    return (
      <div className="flex flex-col gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            onFile(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-7 text-center transition-colors',
            dragging ? 'border-ember bg-ember/5' : 'border-input bg-card',
          )}
        >
          <motion.span
            animate={dragging ? { y: -3, scale: 1.05 } : { y: 0, scale: 1 }}
            className="flex size-10 items-center justify-center rounded-md border border-border bg-paper"
          >
            <Upload className="size-4" aria-hidden="true" />
          </motion.span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Drop PDF here</p>
            <p className="text-xs text-muted-foreground">or</p>
          </div>
          <Button type="button" variant="primary" size="md" onClick={() => inputRef.current?.click()} className="min-w-40">
            <FileText /> Choose PDF
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose notes PDF"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <p className="eyebrow text-[0.6rem] text-muted-foreground">PDF only</p>
        </div>
        <AnimatePresence>
          {rejection && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-xs text-destructive"
              role="alert"
            >
              <AlertTriangle className="size-3.5" /> {rejection}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-paper p-3">
          <p className="text-xs text-muted-foreground">
            Prototype — try a sample file to see each validation outcome:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {samples.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => void run(s.name, s.size)}
                className="rounded-sm border border-border bg-card px-2 py-1 text-xs transition-colors hover:border-foreground/30"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const checks = [
    'PDF readable',
    'Content detected',
    'Not blank',
    'Minimum content present',
  ]

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ember/10 text-ember">
          <FileText className="size-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="truncate text-sm font-medium">{fileName}</p>
          {phase === 'uploading' ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full bg-foreground" animate={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {phase === 'reading' && 'Reading notes…'}
              {phase === 'checks' && 'Checking content…'}
              {phase === 'ai' && 'AI relevance check…'}
              {phase === 'result' && 'Processed'}
            </p>
          )}
        </div>
        {phase !== 'result' && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>

      {/* Deterministic checks */}
      {(phase === 'checks' || phase === 'ai' || (phase === 'result' && scenario !== 'unreadable')) && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border border-border bg-card p-3">
          <Eyebrow className="pb-2">Basic validation</Eyebrow>
          <ul className="flex flex-col gap-1.5">
            {checks.map((label, i) => {
              const done = checksDone > i
              const failed = done && scenario === 'title-only' && i === 3
              return (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-sm border',
                      failed ? 'border-warning bg-warning/15 text-warning' : done ? 'border-success bg-success/15 text-success' : 'border-border',
                    )}
                  >
                    {failed ? <X className="size-3" strokeWidth={3} /> : done ? <DrawnCheck className="size-3" strokeWidth={3.5} /> : null}
                  </span>
                  <span className={cn(!done && 'text-muted-foreground')}>{label}</span>
                  {failed && <span className="ml-auto text-xs text-warning">Only 2 words found</span>}
                </li>
              )
            })}
          </ul>
        </motion.div>
      )}

      {/* Evidence AI */}
      {(phase === 'ai' || (phase === 'result' && scenario !== 'unreadable' && scenario !== 'title-only')) && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between pb-2">
            <Eyebrow>AI relevance check</Eyebrow>
            <EvidenceAiLabel />
          </div>
          <p className="text-sm text-muted-foreground">
            Analyzing notes against: <span className="font-medium text-foreground">{task.title}</span>
          </p>
          {phase === 'ai' && (
            <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                className="absolute inset-y-0 w-1/3 rounded-full bg-success"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {phase === 'result' && (
          <ResultCard
            scenario={scenario}
            task={task}
            onRetry={() => {
              reset()
              window.setTimeout(() => inputRef.current?.click(), 50)
            }}
            onReset={reset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ResultCard({
  scenario,
  task,
  onRetry,
  onReset,
}: {
  scenario: Scenario
  task: Task
  onRetry: () => void
  onReset: () => void
}) {
  const wrap = 'rounded-md border p-4'
  const motionProps = {
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: 'spring' as const, stiffness: 300, damping: 26 },
  }

  if (scenario === 'valid') {
    return (
      <motion.div {...motionProps} className={cn(wrap, 'border-success/35 bg-success/5')}>
        <p className="flex items-center gap-2 font-medium text-success">
          <span className="flex size-5 items-center justify-center rounded-full bg-success text-background">
            <DrawnCheck className="size-3.5" strokeWidth={3.5} delay={0.1} />
          </span>
          <span className="eyebrow text-xs">Evidence valid</span>
        </p>
        <p className="pt-2 text-sm">{'The notes are relevant to today’s topic.'}</p>
        <Eyebrow className="pb-1.5 pt-3">Detected</Eyebrow>
        <ul className="grid grid-cols-2 gap-1.5">
          {task.concepts.map((c, i) => (
            <motion.li
              key={c}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="flex items-center gap-1.5 text-sm"
            >
              <Check className="size-3.5 text-success" strokeWidth={3} /> {c}
            </motion.li>
          ))}
        </ul>
        <p className="flex items-center gap-2 pt-3 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Completing task…
        </p>
      </motion.div>
    )
  }

  if (scenario === 'insufficient') {
    const [found, ...missing] = task.concepts
    return (
      <motion.div {...motionProps} className={cn(wrap, 'border-warning/40 bg-warning/5')}>
        <p className="flex items-center gap-2 text-warning">
          <AlertTriangle className="size-4" />
          <span className="eyebrow text-xs">Evidence insufficient</span>
        </p>
        <p className="pt-2 text-sm">The notes are related but incomplete.</p>
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div>
            <Eyebrow className="pb-1.5">Found</Eyebrow>
            <p className="flex items-center gap-1.5 text-sm">
              <Check className="size-3.5 text-success" strokeWidth={3} /> {found}
            </p>
          </div>
          <div>
            <Eyebrow className="pb-1.5">Missing</Eyebrow>
            <ul className="flex flex-col gap-1">
              {missing.map((m) => (
                <li key={m} className="text-sm">{`• ${m}`}</li>
              ))}
            </ul>
          </div>
        </div>
        <Button variant="primary" size="md" className="mt-4 w-full" onClick={onRetry}>
          <Upload /> Upload Revised Notes
        </Button>
        <p className="pt-2 text-center text-xs text-muted-foreground">Task remains incomplete.</p>
      </motion.div>
    )
  }

  if (scenario === 'title-only') {
    return (
      <motion.div {...motionProps} className={cn(wrap, 'border-warning/40 bg-warning/5')}>
        <p className="flex items-center gap-2 text-warning">
          <AlertTriangle className="size-4" />
          <span className="eyebrow text-xs">Evidence insufficient</span>
        </p>
        <p className="pt-2 text-sm text-pretty">
          This PDF only contains the topic name. A title isn’t study notes — AI check skipped.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-3">
          <div className="rounded-md border border-dashed border-warning/50 bg-card p-3">
            <Eyebrow className="pb-2">Topic name only</Eyebrow>
            <p className="font-serif text-sm">{task.title}</p>
            <p className="pt-3 text-xs text-muted-foreground">2 words · 1 page</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <Eyebrow className="pb-2">Meaningful notes</Eyebrow>
            <div className="flex flex-col gap-1" aria-hidden="true">
              <span className="h-1.5 w-full rounded-full bg-muted" />
              <span className="h-1.5 w-4/5 rounded-full bg-muted" />
              <span className="h-1.5 w-full rounded-full bg-muted" />
              <span className="h-1.5 w-3/5 rounded-full bg-muted" />
            </div>
            <p className="pt-2 text-xs text-muted-foreground">Definitions, how it works, an example</p>
          </div>
        </div>
        <Button variant="primary" size="md" className="mt-4 w-full" onClick={onRetry}>
          <Upload /> Upload Revised Notes
        </Button>
        <p className="pt-2 text-center text-xs text-muted-foreground">Task remains incomplete.</p>
      </motion.div>
    )
  }

  if (scenario === 'invalid') {
    return (
      <motion.div {...motionProps} className={cn(wrap, 'border-destructive/35 bg-destructive/5')}>
        <p className="flex items-center gap-2 text-destructive">
          <X className="size-4" strokeWidth={3} />
          <span className="eyebrow text-xs">Notes not relevant</span>
        </p>
        <dl className="grid grid-cols-2 gap-4 pt-3">
          <div>
            <dt className="eyebrow pb-1 text-muted-foreground">{'Today’s topic'}</dt>
            <dd className="font-serif text-base">{task.title}</dd>
          </div>
          <div>
            <dt className="eyebrow pb-1 text-muted-foreground">Detected mainly</dt>
            <dd className="font-serif text-base">Database Normalization</dd>
          </div>
        </dl>
        <Button variant="primary" size="md" className="mt-4 w-full" onClick={onRetry}>
          <FileText /> Choose Another PDF
        </Button>
        <p className="pt-2 text-center text-xs text-muted-foreground">Task remains incomplete.</p>
      </motion.div>
    )
  }

  return (
    <motion.div {...motionProps} className={cn(wrap, 'border-destructive/35 bg-destructive/5')}>
      <p className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="size-4" />
        <span className="text-sm font-medium">Unable to process this PDF.</span>
      </p>
      <p className="pt-1 text-sm text-muted-foreground">It may be scanned, protected, or damaged. Try exporting it again.</p>
      <Button variant="outline" size="md" className="mt-4 w-full" onClick={onReset}>
        Try again
      </Button>
    </motion.div>
  )
}
