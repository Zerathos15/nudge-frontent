import { cn } from '@/lib/utils'

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="26" height="26" rx="5" className="fill-foreground" />
        <path d="M8 19V9l7 10V9" className="stroke-background" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20.5" cy="14" r="2.2" className="fill-ember" />
      </svg>
      {showWordmark && (
        <span className="font-serif text-lg font-semibold tracking-[0.12em]">NUDGE</span>
      )}
    </span>
  )
}
