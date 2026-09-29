import { TODAY_ISO, type Task, type TaskStatus } from './mock-data'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(iso: string, days: number) {
  const date = parse(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatShort(iso: string) {
  const d = parse(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function formatLong(iso: string) {
  const d = parse(iso)
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function weekday(iso: string) {
  return DAYS[parse(iso).getUTCDay()]
}

export function dayOfMonth(iso: string) {
  return parse(iso).getUTCDate()
}

export function daysBetween(a: string, b: string) {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000)
}

export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const start = new Date(first)
  start.setUTCDate(1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    return { iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month }
  })
}

export function monthLabel(year: number, month: number) {
  return `${MONTHS_LONG[month]} ${year}`
}

export type PlanItem = {
  id: string
  time: string
  track: string
  title: string
  status: TaskStatus
  taskId?: string
}

const ROTATION: Record<string, string[]> = {
  DSA: ['Two Pointers', 'Merge Sort', 'Quick Sort', 'Linear Search', 'Search on Answer', 'Ternary Search', 'Heaps'],
  AIML: ['Clustering', 'Evaluation Metrics', 'Perceptron', 'Gradient Descent', 'Backpropagation', 'Loss Functions', 'Regularization'],
  Implementation: ['Datasets', 'Data Loaders', 'Model Setup', 'Loss & Optimizers', 'Evaluation Loop', 'Logging', 'Checkpoints'],
  Research: ['Literature Review', 'Reading Notes', 'Research Question', 'Related Work', 'Experiment', 'Analysis', 'Write-up'],
  Interview: ['STAR Stories', 'Mock Round', 'Revision', 'Technical Questions', 'Behavioral', 'Mock Round', 'Revision'],
  Systems: ['System Calls', 'Processes', 'Scheduling', 'Memory', 'Threads', 'Locks', 'File Systems'],
}

function pick(track: string, iso: string) {
  const list = ROTATION[track] ?? ['Topic']
  return list[Math.abs(daysBetween('2026-09-01', iso)) % list.length]
}

function template(iso: string) {
  const dow = parse(iso).getUTCDay()
  if (dow === 0 || dow === 6) {
    return [
      { time: '10:00 AM', track: 'DSA' },
      { time: '11:00 AM', track: 'Interview' },
      { time: '12:00 PM', track: 'Break' },
      { time: '2:00 PM', track: 'Systems' },
    ]
  }
  return [
    { time: '4:00 PM', track: 'DSA' },
    { time: '5:00 PM', track: 'Break' },
    { time: '6:00 PM', track: 'AIML' },
    { time: '7:00 PM', track: 'Implementation' },
    { time: '8:00 PM', track: dow % 2 === 0 ? 'Interview' : 'Research' },
  ]
}

export const PLAN_HORIZON_DAYS = 21

/** Builds the planner view for any date from the schedule template + live task state. */
export function getDayPlan(iso: string, tasks: Task[]): PlanItem[] | null {
  if (daysBetween(TODAY_ISO, iso) > PLAN_HORIZON_DAYS) return null

  if (iso === TODAY_ISO) {
    return tasks.map((task) => ({
      id: task.id,
      time: task.start,
      track: task.track,
      title: task.title,
      status: task.status,
      taskId: task.kind === 'study' ? task.id : undefined,
    }))
  }

  const isPast = iso < TODAY_ISO
  const items: PlanItem[] = template(iso).map((slot, i) => ({
    id: `${iso}-${i}`,
    time: slot.time,
    track: slot.track,
    title: slot.track === 'Break' ? 'Break' : pick(slot.track, iso),
    status: slot.track === 'Break' ? 'break' : isPast ? 'completed' : 'upcoming',
  }))

  for (const task of tasks) {
    const entry = task.history.find((h) => h.date === iso)
    if (!entry || entry.label === 'Completed') continue
    const status: TaskStatus =
      entry.outcome === 'not-completed'
        ? 'missed'
        : entry.outcome === 'completed'
          ? 'completed'
          : 'carried'
    const item: PlanItem = {
      id: `${iso}-${task.id}`,
      time: task.start,
      track: task.track,
      title: task.title,
      status,
      taskId: task.id,
    }
    const slot = items.findIndex((it) => it.track === task.track)
    if (slot >= 0) items[slot] = item
    else items.push(item)
  }

  return items
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local.charAt(0)}•••••@${domain}`
}
