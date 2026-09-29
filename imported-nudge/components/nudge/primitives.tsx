'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'motion/react'
import { useSyncExternalStore, type ComponentProps, type ReactNode } from 'react'
import { ArrowUpRight, Check, Circle, Coffee, Dot, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/lib/mock-data'

export const btn = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_0_rgba(0,0,0,0.08)]',
        ember: 'bg-ember text-ember-foreground hover:bg-ember/90',
        outline: 'border border-input bg-card hover:bg-accent text-foreground',
        ghost: 'hover:bg-accent text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-xs',
        md: 'h-10 rounded-md px-4 text-sm',
        lg: 'h-11 rounded-md px-5 text-sm',
        icon: 'size-9 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof btn>) {
  return <button className={cn(btn({ variant, size }), className)} {...props} />
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow text-muted-foreground', className)}>{children}</p>
}

export function Panel({
  className,
  children,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent),0_8px_24px_-18px_color-mix(in_oklab,var(--foreground)_30%,transparent)]',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function DrawnCheck({
  className,
  delay = 0,
  strokeWidth = 2.5,
}: {
  className?: string
  delay?: number
  strokeWidth?: number
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('size-4', className)} aria-hidden="true">
      <motion.path
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  )
}

export function ProgressBar({
  value,
  className,
  tone = 'ink',
  label,
}: {
  value: number
  className?: string
  tone?: 'ink' | 'ember' | 'success'
  label?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <motion.div
        className={cn(
          'h-full rounded-full',
          tone === 'ink' && 'bg-foreground',
          tone === 'ember' && 'bg-ember',
          tone === 'success' && 'bg-success',
        )}
        initial={false}
        animate={{ width: `${value}%` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      />
    </div>
  )
}

/** Retro block progress, e.g. █████████░ */
export function BlockBar({ value, blocks = 10 }: { value: number; blocks?: number }) {
  const filled = Math.round((value / 100) * blocks)
  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: blocks }, (_, i) => (
        <motion.span
          key={i}
          className={cn('h-4 flex-1 rounded-[2px]', i < filled ? 'bg-foreground' : 'bg-muted')}
          initial={{ scaleY: 0.3, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: i * 0.035, duration: 0.25 }}
        />
      ))}
    </div>
  )
}

const STATUS_META: Record<
  TaskStatus,
  { label: string; className: string; icon: ReactNode }
> = {
  completed: {
    label: 'Completed',
    className: 'text-success border-success/30 bg-success/10',
    icon: <Check className="size-3" strokeWidth={3} />,
  },
  'in-progress': {
    label: 'In progress',
    className: 'text-ember border-ember/35 bg-ember/10',
    icon: <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-40" /><span className="relative inline-flex size-2 rounded-full bg-ember" /></span>,
  },
  upcoming: {
    label: 'Upcoming',
    className: 'text-muted-foreground border-border bg-transparent',
    icon: <Circle className="size-2.5" strokeWidth={2.5} />,
  },
  carried: {
    label: 'Carried forward',
    className: 'text-warning border-warning/35 bg-warning/10',
    icon: <ArrowUpRight className="size-3" strokeWidth={2.5} />,
  },
  break: {
    label: 'Break',
    className: 'text-muted-foreground border-dashed border-border',
    icon: <Coffee className="size-3" />,
  },
  missed: {
    label: 'Not completed',
    className: 'text-destructive border-destructive/30 bg-destructive/10',
    icon: <X className="size-3" strokeWidth={2.5} />,
  },
}

export function StatusPill({
  status,
  className,
  compact,
}: {
  status: TaskStatus
  className?: string
  compact?: boolean
}) {
  const meta = STATUS_META[status]
  return (
    <motion.span
      layout
      key={status}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'eyebrow inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[0.6rem]',
        meta.className,
        className,
      )}
    >
      {meta.icon}
      {!compact && meta.label}
      {compact && <span className="sr-only">{meta.label}</span>}
    </motion.span>
  )
}

export function StatusDot({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    completed: 'bg-success border-success',
    'in-progress': 'bg-ember border-ember',
    upcoming: 'bg-card border-muted-foreground/50',
    carried: 'bg-warning border-warning',
    break: 'bg-muted border-dashed border-muted-foreground/40',
    missed: 'bg-destructive border-destructive',
  }
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full border-2', map[status])} aria-hidden="true" />
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'eyebrow inline-flex items-center rounded-sm border border-border bg-paper px-1.5 py-0.5 text-[0.6rem] text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Breadcrumbs({ parts }: { parts: string[] }) {
  return (
    <p className="flex flex-wrap items-center text-xs text-muted-foreground">
      {parts.filter(Boolean).map((p, i) => (
        <span key={p + i} className="inline-flex items-center">
          {i > 0 && <Dot className="size-4" aria-hidden="true" />}
          {p}
        </span>
      ))}
    </p>
  )
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia('(max-width: 767px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false,
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-serif text-3xl font-medium tracking-tight text-balance md:text-4xl">{title}</h1>
        {description && <p className="max-w-xl text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
