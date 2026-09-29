'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Award, Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from './store'
import { DrawnCheck } from './primitives'
import { CloseButton } from './overlay'

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-popover p-3 pr-2 shadow-xl"
          >
            <span
              className={cn(
                'relative flex size-10 shrink-0 items-center justify-center rounded-md border',
                toast.kind === 'achievement' && 'border-ember/40 bg-ember/10 text-ember',
                toast.kind === 'success' && 'border-success/30 bg-success/10 text-success',
                toast.kind === 'info' && 'border-border bg-muted text-foreground',
              )}
            >
              {toast.kind === 'achievement' ? (
                <motion.span initial={{ scale: 0.4, rotate: -12 }} animate={{ scale: [0.4, 1.15, 1], rotate: 0 }} transition={{ duration: 0.5 }}>
                  <Award className="size-5" />
                </motion.span>
              ) : toast.kind === 'success' ? (
                <DrawnCheck className="size-5" delay={0.1} />
              ) : (
                <Info className="size-4" />
              )}
              {toast.kind === 'achievement' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.45, type: 'spring' }}
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-success text-background"
                >
                  <Check className="size-2.5" strokeWidth={3.5} />
                </motion.span>
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col pt-0.5">
              <p className="eyebrow text-muted-foreground">{toast.eyebrow}</p>
              <p className="font-serif text-base font-medium">{toast.title}</p>
              {toast.body && <p className="text-xs text-muted-foreground">{toast.body}</p>}
            </div>
            <CloseButton onClick={() => dismissToast(toast.id)} label="Dismiss" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
