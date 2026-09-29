'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/mock-data'
import { Modal, CloseButton } from './overlay'
import { Button, DrawnCheck, Eyebrow } from './primitives'
import { useStore } from './store'

function questionsFor(task: Task) {
  const t = task.title
  const mechanism =
    t === 'Neural Networks'
      ? 'Explain how backpropagation works.'
      : t === 'Binary Search'
        ? 'Why does halving the search space guarantee O(log n)?'
        : `Explain the mechanism behind ${t}.`
  return [
    `Define ${t} in your own words.`,
    mechanism,
    `Walk through a small worked example of ${t}.`,
    `What are the limitations or edge cases of ${t}?`,
    `When would you choose a different approach instead?`,
  ]
}

export function MasteryDialog() {
  const { masteryTaskId, openMastery, tasks } = useStore()
  const task = tasks.find((t) => t.id === masteryTaskId)
  return (
    <Modal open={Boolean(task)} onClose={() => openMastery(null)} label="Mastery check" className="max-w-xl">
      {task && <MasteryBody key={task.id} task={task} />}
    </Modal>
  )
}

function MasteryBody({ task }: { task: Task }) {
  const { openMastery, setMastery } = useStore()
  const questions = questionsFor(task)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [phase, setPhase] = useState<'answering' | 'evaluating' | 'mastered' | 'failed'>('answering')

  const submit = () => {
    setPhase('evaluating')
    const avg = answers.reduce((s, a) => s + a.trim().length, 0) / answers.length
    window.setTimeout(() => {
      const result = avg >= 40 ? 'mastered' : 'failed'
      setPhase(result)
      setMastery(task.id, result)
    }, 1600)
  }

  const retry = () => {
    setAnswers(questions.map(() => ''))
    setIndex(0)
    setPhase('answering')
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <Eyebrow>Mastery check</Eyebrow>
          <h2 className="font-serif text-xl font-medium">{task.title}</h2>
        </div>
        <CloseButton onClick={() => openMastery(null)} />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'answering' && (
          <motion.div
            key={`q-${index}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="eyebrow text-muted-foreground">
                Question {index + 1} / {questions.length}
              </p>
              <div className="flex gap-1" aria-hidden="true">
                {questions.map((_, i) => (
                  <span key={i} className={cn('h-1 w-6 rounded-full', i <= index ? 'bg-foreground' : 'bg-muted')} />
                ))}
              </div>
            </div>
            <p className="font-serif text-lg leading-snug text-balance">{questions[index]}</p>
            <label className="flex flex-col gap-1.5">
              <span className="sr-only">Your answer</span>
              <textarea
                autoFocus
                value={answers[index]}
                onChange={(e) =>
                  setAnswers((prev) => prev.map((a, i) => (i === index ? e.target.value : a)))
                }
                rows={5}
                placeholder="Write your answer…"
                className="bg-ruled w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm leading-8 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <span className="text-xs text-muted-foreground">Explain it like you would to a friend. Detailed answers score higher.</span>
            </label>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="md" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft /> Back
              </Button>
              {index < questions.length - 1 ? (
                <Button variant="primary" size="md" onClick={() => setIndex((i) => i + 1)}>
                  Answer <ArrowRight />
                </Button>
              ) : (
                <Button variant="ember" size="md" onClick={submit}>
                  Submit answers
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'evaluating' && (
          <motion.div
            key="eval"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 px-5 py-14 text-center"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Evaluating answers…</p>
          </motion.div>
        )}

        {phase === 'mastered' && (
          <motion.div
            key="mastered"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 px-5 py-10 text-center"
          >
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.1, 1] }}
              className="flex size-14 items-center justify-center rounded-full bg-success text-background"
            >
              <DrawnCheck className="size-7" strokeWidth={3} delay={0.2} />
            </motion.span>
            <p className="eyebrow text-sm text-success">Mastered</p>
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              You explained, applied and reasoned about {task.title}. It now counts toward your mastered topics.
            </p>
            <Button variant="primary" size="md" className="mt-2" onClick={() => openMastery(null)}>
              Done
            </Button>
          </motion.div>
        )}

        {phase === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 px-5 py-10 text-center"
          >
            <p className="eyebrow text-sm text-destructive">Failed mastery</p>
            <p className="font-serif text-lg">Needs reinforcement</p>
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              Your answers were too brief to show understanding. Review your notes and try again.
            </p>
            <Button variant="primary" size="md" className="mt-2" onClick={retry}>
              <RotateCcw /> Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
