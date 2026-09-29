'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from './primitives'

function useOverlayBehavior(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => ref.current?.focus(), 30)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open, onClose])
  return ref
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
    >
      <X className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  )
}

/** Right drawer on desktop, bottom sheet on mobile. */
export function Sheet({
  open,
  onClose,
  label,
  children,
  side = 'auto',
  className,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  side?: 'auto' | 'bottom'
  className?: string
}) {
  const isMobile = useIsMobile()
  const bottom = side === 'bottom' || isMobile
  const ref = useOverlayBehavior(open, onClose)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={cn(
              'absolute flex flex-col bg-paper outline-none shadow-2xl',
              bottom
                ? 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl border-t border-border'
                : 'inset-y-0 right-0 w-full max-w-[480px] border-l border-border',
              className,
            )}
            initial={bottom ? { y: '100%' } : { x: '100%' }}
            animate={bottom ? { y: 0 } : { x: 0 }}
            exit={bottom ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {bottom && (
              <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-border" />
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Modal({
  open,
  onClose,
  label,
  children,
  className,
  position = 'center',
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  className?: string
  position?: 'center' | 'top'
}) {
  const ref = useOverlayBehavior(open, onClose)
  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex justify-center p-4',
            position === 'center' ? 'items-center' : 'items-start pt-[12vh]',
          )}
        >
          <motion.div
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={cn(
              'relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-paper shadow-2xl outline-none',
              className,
            )}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
