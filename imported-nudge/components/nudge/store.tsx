'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TASKS,
  TODAY_ISO,
  TRACKS,
  USER,
  type Achievement,
  type MasteryState,
  type NotificationItem,
  type Task,
  type Topic,
  type TopicStatus,
  type Track,
} from '@/lib/mock-data'
import { addDays } from '@/lib/schedule'

export type Toast = {
  id: string
  kind: 'achievement' | 'success' | 'info'
  eyebrow: string
  title: string
  body?: string
}

type State = {
  tasks: Task[]
  openTaskId: string | null
  masteryTaskId: string | null
  achievements: Achievement[]
  notifications: NotificationItem[]
  toasts: Toast[]
  streak: number
  masteredToday: number
}

type Action =
  | { type: 'open-task'; id: string | null }
  | { type: 'open-mastery'; id: string | null }
  | { type: 'complete-task'; id: string; fileName: string; detected: string[] }
  | { type: 'carry-forward'; id: string }
  | { type: 'set-mastery'; id: string; result: MasteryState }
  | { type: 'unlock'; id: string }
  | { type: 'toast'; toast: Toast }
  | { type: 'dismiss-toast'; id: string }
  | { type: 'read-notifications' }

const now = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'open-task':
      return { ...state, openTaskId: action.id }
    case 'open-mastery':
      return { ...state, masteryTaskId: action.id }
    case 'complete-task': {
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.id) return task
          const lastDate = task.history.at(-1)?.date ?? TODAY_ISO
          return {
            ...task,
            status: 'completed',
            mastery: 'pending',
            evidence: {
              fileName: action.fileName,
              detected: action.detected,
              validatedAt: now(),
            },
            history: [
              ...task.history,
              { date: lastDate, label: 'Completed', outcome: 'completed' },
            ],
          }
        }),
      }
    }
    case 'carry-forward': {
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.id || task.status === 'completed') return task
          const last = task.history.at(-1)
          const lastDate = last?.date ?? TODAY_ISO
          return {
            ...task,
            status: 'carried',
            history: [
              ...task.history.slice(0, -1),
              { ...(last ?? { date: lastDate, label: 'Scheduled' as const }), outcome: 'not-completed' },
              { date: addDays(lastDate, 1), label: 'Carried Forward', outcome: 'open' },
            ],
          }
        }),
        notifications: [
          {
            id: `n-${Date.now()}`,
            kind: 'carried',
            title: 'Task carried forward',
            subject: state.tasks.find((t) => t.id === action.id)?.title ?? '',
            time: now(),
            taskId: action.id,
            unread: true,
          },
          ...state.notifications,
        ],
      }
    }
    case 'set-mastery':
      return {
        ...state,
        masteredToday: state.masteredToday + (action.result === 'mastered' ? 1 : 0),
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, mastery: action.result } : task,
        ),
      }
    case 'unlock':
      return {
        ...state,
        streak: action.id === 'streak-50' ? 50 : state.streak,
        achievements: state.achievements.map((a) =>
          a.id === action.id ? { ...a, earned: 'Sep 28' } : a,
        ),
        notifications: [
          {
            id: `n-${Date.now()}-a`,
            kind: 'achievement',
            title: 'New achievement',
            subject: state.achievements.find((a) => a.id === action.id)?.title ?? '',
            time: now(),
            unread: true,
          },
          ...state.notifications,
        ],
      }
    case 'toast':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'dismiss-toast':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'read-notifications':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
      }
  }
}

type DerivedTrack = Track & { liveProgress: number; flatTopics: Topic[] }

type Store = State & {
  openTask: (id: string | null) => void
  openMastery: (id: string | null) => void
  completeTask: (id: string, fileName: string, detected: string[]) => void
  carryForward: (id: string) => void
  setMastery: (id: string, result: MasteryState) => void
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  readNotifications: () => void
  tracks: DerivedTrack[]
  stats: {
    completedToday: number
    totalToday: number
    overall: number
  }
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    tasks: INITIAL_TASKS,
    openTaskId: null,
    masteryTaskId: null,
    achievements: INITIAL_ACHIEVEMENTS,
    notifications: INITIAL_NOTIFICATIONS,
    toasts: [],
    streak: USER.streak,
    masteredToday: 0,
  })

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    dispatch({ type: 'toast', toast: { ...toast, id } })
    window.setTimeout(() => dispatch({ type: 'dismiss-toast', id }), 5200)
  }, [])

  const completeTask = useCallback(
    (id: string, fileName: string, detected: string[]) => {
      const task = state.tasks.find((t) => t.id === id)
      const wasCarried = task?.status === 'carried'
      dispatch({ type: 'complete-task', id, fileName, detected })
      pushToast({
        kind: 'success',
        eyebrow: 'Task completed',
        title: task?.title ?? 'Task',
        body: 'Notes validated. Nicely done.',
      })
      const streak50 = state.achievements.find((a) => a.id === 'streak-50')
      if (streak50 && !streak50.earned) {
        window.setTimeout(() => {
          dispatch({ type: 'unlock', id: 'streak-50' })
          pushToast({
            kind: 'achievement',
            eyebrow: 'New achievement',
            title: '50 Day Streak',
            body: 'You’ve shown up for 50 days.',
          })
        }, 1400)
      } else if (wasCarried) {
        pushToast({
          kind: 'info',
          eyebrow: 'Carried task cleared',
          title: 'Back on track',
        })
      }
    },
    [state.tasks, state.achievements, pushToast],
  )

  const tracks = useMemo<DerivedTrack[]>(() => {
    const byTask = new Map(state.tasks.map((t) => [t.id, t]))
    return TRACKS.map((track) => {
      let bump = 0
      const phases = track.phases.map((phase) => ({
        ...phase,
        modules: phase.modules.map((mod) => ({
          ...mod,
          topics: mod.topics.map((topic) => {
            if (!topic.taskId) return topic
            const task = byTask.get(topic.taskId)
            let status: TopicStatus = topic.status
            if (task?.status === 'completed') {
              if (topic.status !== 'done') bump += 3
              status = 'done'
            }
            return {
              ...topic,
              status,
              mastered: task?.mastery === 'mastered' || topic.mastered,
            }
          }),
        })),
      }))
      const flatTopics = phases.flatMap((p) => p.modules.flatMap((m) => m.topics))
      // Derive "current" as the first unfinished topic so checkpoints advance automatically.
      const firstOpen = flatTopics.findIndex((tp) => tp.status !== 'done')
      const normalized = flatTopics.map((tp, i) =>
        tp.status === 'done' ? tp : { ...tp, status: (i === firstOpen ? 'current' : 'todo') as TopicStatus },
      )
      const map = new Map(normalized.map((tp) => [tp.id, tp]))
      return {
        ...track,
        current: normalized[firstOpen]?.name ?? 'Complete',
        phases: phases.map((p) => ({
          ...p,
          modules: p.modules.map((m) => ({
            ...m,
            topics: m.topics.map((tp) => map.get(tp.id) ?? tp),
          })),
        })),
        flatTopics: normalized,
        liveProgress: Math.min(100, track.progress + bump),
      }
    })
  }, [state.tasks])

  const stats = useMemo(() => {
    const study = state.tasks.filter((t) => t.kind === 'study')
    const completedToday = study.filter((t) => t.status === 'completed').length
    const bumps = tracks.reduce((sum, t) => sum + (t.liveProgress - t.progress), 0)
    const overall = Math.round(82 + bumps / 3)
    return { completedToday, totalToday: study.length, overall: Math.min(100, overall) }
  }, [state.tasks, tracks])

  const value = useMemo<Store>(
    () => ({
      ...state,
      tracks,
      stats,
      openTask: (id) => dispatch({ type: 'open-task', id }),
      openMastery: (id) => dispatch({ type: 'open-mastery', id }),
      completeTask,
      carryForward: (id) => dispatch({ type: 'carry-forward', id }),
      setMastery: (id, result) => dispatch({ type: 'set-mastery', id, result }),
      pushToast,
      dismissToast: (id) => dispatch({ type: 'dismiss-toast', id }),
      readNotifications: () => dispatch({ type: 'read-notifications' }),
    }),
    [state, tracks, stats, completeTask, pushToast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
