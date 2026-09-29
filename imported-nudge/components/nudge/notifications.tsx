'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Award, Bell, FileUp, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '@/lib/mock-data'
import { useStore } from './store'

const KIND = {
  notes: { icon: FileUp, tone: 'text-ember bg-ember/10' },
  carried: { icon: ArrowUpRight, tone: 'text-warning bg-warning/10' },
  mastery: { icon: GraduationCap, tone: 'text-foreground bg-muted' },
  achievement: { icon: Award, tone: 'text-success bg-success/10' },
} satisfies Record<NotificationItem['kind'], { icon: typeof Bell; tone: string }>

export function NotificationsButton() {
  const { notifications, readNotifications, openTask } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifications.filter((n) => n.unread).length

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-[18px]" />
        <span className="sr-only">Notifications{unread ? `, ${unread} unread` : ''}</span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-ember ring-2 ring-background"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="fixed inset-x-3 top-16 z-40 origin-top-right rounded-lg border border-border bg-popover shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="eyebrow">Notifications</p>
              {unread > 0 && (
                <button type="button" onClick={readNotifications} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-y-auto p-1.5">
              {notifications.map((n) => {
                const { icon: Icon, tone } = KIND[n.kind]
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        if (n.taskId) openTask(n.taskId)
                      }}
                      className="flex w-full items-start gap-3 rounded-md px-2.5 py-2.5 text-left hover:bg-accent"
                    >
                      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md', tone)}>
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{n.subject}</span>
                      </span>
                      <span className="flex flex-col items-end gap-1.5">
                        <span className="text-[0.68rem] text-muted-foreground tabular-nums">{n.time}</span>
                        {n.unread && <span className="size-1.5 rounded-full bg-ember" aria-label="Unread" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
