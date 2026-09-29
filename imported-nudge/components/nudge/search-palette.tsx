'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { BookOpen, CalendarDays, CornerDownLeft, FileText, ListChecks, Search, Waypoints } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from './overlay'
import { useStore } from './store'

type Result = {
  id: string
  group: 'Topics' | 'Tasks' | 'Tracks' | 'Notes' | 'Schedule'
  title: string
  meta: string
  action: () => void
}

const ICONS = {
  Topics: BookOpen,
  Tasks: ListChecks,
  Tracks: Waypoints,
  Notes: FileText,
  Schedule: CalendarDays,
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Search" position="top" className="max-w-xl">
      <PaletteBody onClose={onClose} />
    </Modal>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { tasks, tracks, openTask } = useStore()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const all = useMemo<Result[]>(() => {
    const go = (href: string) => () => {
      onClose()
      router.push(href)
    }
    const open = (id: string) => () => {
      onClose()
      openTask(id)
    }
    const study = tasks.filter((t) => t.kind === 'study')
    return [
      ...study.map((t) => ({
        id: `task-${t.id}`,
        group: 'Tasks' as const,
        title: `${t.track} — ${t.title}`,
        meta: `${t.start} · ${t.status.replace('-', ' ')}`,
        action: open(t.id),
      })),
      ...tracks.map((t) => ({
        id: `track-${t.id}`,
        group: 'Tracks' as const,
        title: t.name,
        meta: `${t.phase} · ${t.module} · ${t.liveProgress}%`,
        action: go(`/tracks/${t.id}`),
      })),
      ...tracks.flatMap((track) =>
        track.flatTopics.map((topic) => ({
          id: `topic-${track.id}-${topic.id}`,
          group: 'Topics' as const,
          title: topic.name,
          meta: `${track.name} · ${topic.status === 'done' ? 'Completed' : topic.status === 'current' ? 'Current' : 'Upcoming'}`,
          action: topic.taskId ? open(topic.taskId) : go(`/tracks/${track.id}`),
        })),
      ),
      ...study
        .filter((t) => t.evidence)
        .map((t) => ({
          id: `note-${t.id}`,
          group: 'Notes' as const,
          title: t.evidence!.fileName,
          meta: `${t.title} · validated ${t.evidence!.validatedAt}`,
          action: open(t.id),
        })),
      { id: 's-today', group: 'Schedule' as const, title: 'Today', meta: 'Monday, September 28', action: go('/schedule?view=today') },
      { id: 's-week', group: 'Schedule' as const, title: 'This week', meta: 'Planner week view', action: go('/schedule') },
      { id: 's-month', group: 'Schedule' as const, title: 'September', meta: 'Month overview', action: go('/schedule?view=month') },
    ]
  }, [tasks, tracks, router, onClose, openTask])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? all.filter((r) => `${r.title} ${r.meta}`.toLowerCase().includes(q)) : all.filter((r) => r.group !== 'Topics').slice(0, 9)
    return list.slice(0, 24)
  }, [all, query])

  const groups = useMemo(() => {
    const map = new Map<Result['group'], Result[]>()
    for (const r of results) map.set(r.group, [...(map.get(r.group) ?? []), r])
    return [...map.entries()]
  }, [results])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      results[active]?.action()
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <label className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Search</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          placeholder="Search topics, tasks, tracks, notes, schedule…"
          className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={results[active]?.id}
        />
      </label>
      <div id="search-results" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
        {results.length === 0 && (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            {'Nothing matches “'}
            {query}
            {'”.'}
          </p>
        )}
        {groups.map(([group, items]) => {
          const Icon = ICONS[group]
          return (
            <div key={group} className="pb-2">
              <p className="eyebrow px-3 pb-1 pt-2 text-muted-foreground">{group}</p>
              {items.map((item) => {
                const index = results.indexOf(item)
                const selected = index === active
                return (
                  <button
                    key={item.id}
                    id={item.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(index)}
                    onClick={item.action}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                      selected && 'bg-accent',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{item.title}</span>
                      <span className="truncate text-xs capitalize text-muted-foreground">{item.meta}</span>
                    </span>
                    {selected && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
