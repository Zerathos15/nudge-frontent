'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CalendarCheck2,
  CalendarDays,
  ChevronsLeft,
  Flag,
  Flame,
  House,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Waypoints,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { USER } from '@/lib/mock-data'
import { Logo } from './brand'
import { useStore } from './store'
import { Sheet } from './overlay'
import { SearchPalette } from './search-palette'
import { NotificationsButton } from './notifications'
import { Toasts } from './toasts'
import { TaskDrawer } from './task-drawer'
import { MasteryDialog } from './mastery-dialog'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: House },
  { href: '/today', label: 'Today', icon: CalendarCheck2 },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/tracks', label: 'Tracks', icon: Waypoints },
  { href: '/checkpoint', label: 'Checkpoint', icon: Flag },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
]

const NAV_BOTTOM = [
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/today', label: 'Today', icon: CalendarCheck2 },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/tracks', label: 'Tracks', icon: Waypoints },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
}: {
  href: string
  label: string
  icon: typeof House
  collapsed: boolean
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-md border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}
      <Icon className="relative size-4 shrink-0" />
      {!collapsed && <span className="relative">{label}</span>}
      {active && !collapsed && (
        <span className="relative ml-auto size-1.5 rounded-full bg-ember" aria-hidden="true" />
      )}
    </Link>
  )
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 232 }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
    >
      <div className={cn('flex h-16 items-center border-b border-sidebar-border', collapsed ? 'justify-center' : 'justify-between px-4')}>
        <Link href="/dashboard" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo showWordmark={!collapsed} />
          <span className="sr-only">NUDGE home</span>
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronsLeft className="size-4" />
            <span className="sr-only">Collapse sidebar</span>
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="mx-auto mt-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <Menu className="size-4" />
          <span className="sr-only">Expand sidebar</span>
        </button>
      )}

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 p-3">
        {!collapsed && <p className="eyebrow px-2.5 pb-2 pt-1 text-muted-foreground/80">Planner</p>}
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} collapsed={collapsed} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-sidebar-border p-3">
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} {...item} collapsed={collapsed} active={isActive(pathname, item.href)} />
        ))}
        {!collapsed && (
          <p className="px-2.5 pt-3 font-serif text-xs italic text-muted-foreground">Keep moving forward.</p>
        )}
      </div>
    </motion.aside>
  )
}

function AvatarMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
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
        aria-haspopup="menu"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-secondary font-serif text-sm font-medium outline-none transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {USER.initials}
        <span className="sr-only">Open account menu</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-11 z-40 w-56 origin-top-right rounded-lg border border-border bg-popover p-1.5 shadow-xl"
          >
            <div className="border-b border-border px-2.5 pb-2.5 pt-1.5">
              <p className="text-sm font-medium">{USER.name}</p>
              <p className="truncate text-xs text-muted-foreground">{USER.email}</p>
            </div>
            <div className="flex flex-col pt-1.5">
              {[
                { href: '/profile', label: 'Profile', icon: UserRound },
                { href: '/settings', label: 'Settings', icon: Settings },
                { href: '/settings?section=plan', label: 'My Learning Plan', icon: LayoutGrid },
              ].map((item) => (
                <Link
                  key={item.href}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-accent"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </Link>
              ))}
              <Link
                role="menuitem"
                href="/sign-in"
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TopBar({ onSearch }: { onSearch: () => void }) {
  const { streak } = useStore()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-8">
      <Link href="/dashboard" className="md:hidden" aria-label="NUDGE home">
        <Logo />
      </Link>
      <div className="hidden items-center gap-3 md:flex">
        <p className="font-serif text-sm italic text-muted-foreground">Monday, September 28</p>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flame className="size-3.5 text-ember" aria-hidden="true" />
          <motion.span key={streak} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-medium text-foreground tabular-nums">
            {streak}
          </motion.span>
          day streak
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:w-60"
        >
          <Search className="size-4" />
          <span className="hidden md:inline">Search topics, tasks…</span>
          <span className="sr-only md:hidden">Search</span>
        </button>
        <NotificationsButton />
        <AvatarMenu />
      </div>
    </header>
  )
}

function MobileNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname()
  const moreActive = ['/checkpoint', '/progress', '/profile', '/settings'].some((p) => isActive(pathname, p))
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem]',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {active && (
              <motion.span layoutId="mobile-nav" className="absolute top-0 h-0.5 w-8 rounded-full bg-ember" />
            )}
            <Icon className="size-5" />
            {label}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={onMore}
        className={cn(
          'relative flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem]',
          moreActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {moreActive && <motion.span layoutId="mobile-nav" className="absolute top-0 h-0.5 w-8 rounded-full bg-ember" />}
        <LayoutGrid className="size-5" />
        More
      </button>
    </nav>
  )
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = [
    { href: '/checkpoint', label: 'Checkpoint', icon: Flag },
    { href: '/progress', label: 'Progress', icon: TrendingUp },
    { href: '/profile', label: 'Profile', icon: UserRound },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]
  return (
    <Sheet open={open} onClose={onClose} label="More" side="bottom">
      <div className="flex flex-col gap-1 px-4 pb-8 pt-2">
        <p className="eyebrow px-2 pb-2 text-muted-foreground">More</p>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex h-12 items-center gap-3 rounded-md px-3 text-sm hover:bg-accent"
          >
            <item.icon className="size-4 text-muted-foreground" />
            {item.label}
          </Link>
        ))}
        <Link href="/sign-in" className="flex h-12 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent">
          <LogOut className="size-4" />
          Sign out
        </Link>
      </div>
    </Sheet>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1100px)')
    if (mq.matches) setCollapsed(true)
  }, [])

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSearch={() => setSearchOpen(true)} />
        <main className="bg-dots flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <TaskDrawer />
      <MasteryDialog />
      <Toasts />
    </div>
  )
}
