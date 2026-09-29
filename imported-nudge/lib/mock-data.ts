/**
 * Centralized mock data for the NUDGE prototype.
 * Every screen reads from here (via the store), so swapping in a real
 * backend means replacing these exports with fetched data.
 */

export const TODAY_ISO = '2026-09-28'
export const USER = {
  name: 'Alex Morgan',
  firstName: 'Alex',
  email: 'alex.morgan@example.com',
  initials: 'AM',
  streak: 49,
}

export type TaskStatus =
  | 'completed'
  | 'in-progress'
  | 'upcoming'
  | 'carried'
  | 'break'
  | 'missed'

export type MasteryState = 'locked' | 'pending' | 'mastered' | 'failed'

export type HistoryEntry = {
  date: string
  label: 'Scheduled' | 'Carried Forward' | 'Completed'
  outcome: 'open' | 'not-completed' | 'completed'
}

export type Task = {
  id: string
  kind: 'study' | 'break'
  start: string
  end: string
  trackId: string
  track: string
  phase: string
  module: string
  topicIndex: string
  title: string
  status: TaskStatus
  prerequisites: { name: string; done: boolean }[]
  concepts: string[]
  history: HistoryEntry[]
  evidence?: { fileName: string; detected: string[]; validatedAt: string }
  mastery: MasteryState
}

export const INITIAL_TASKS: Task[] = [
  {
    id: 't-dsa-binary-search',
    kind: 'study',
    start: '4:00 PM',
    end: '5:00 PM',
    trackId: 'dsa',
    track: 'DSA',
    phase: 'Phase 2',
    module: 'Module 4',
    topicIndex: 'Topic 2',
    title: 'Binary Search',
    status: 'completed',
    prerequisites: [
      { name: 'Linear Search', done: true },
      { name: 'Sorting Basics', done: true },
    ],
    concepts: ['Search space', 'Midpoint', 'Boundaries', 'Complexity'],
    history: [
      { date: '2026-09-28', label: 'Scheduled', outcome: 'open' },
      { date: '2026-09-28', label: 'Completed', outcome: 'completed' },
    ],
    evidence: {
      fileName: 'Binary_Search_Notes.pdf',
      detected: ['Search space', 'Midpoint', 'Boundaries', 'Complexity'],
      validatedAt: '4:52 PM',
    },
    mastery: 'pending',
  },
  {
    id: 't-break',
    kind: 'break',
    start: '5:00 PM',
    end: '6:00 PM',
    trackId: '',
    track: 'Break',
    phase: '',
    module: '',
    topicIndex: '',
    title: 'Break',
    status: 'break',
    prerequisites: [],
    concepts: [],
    history: [],
    mastery: 'locked',
  },
  {
    id: 't-aiml-neural-networks',
    kind: 'study',
    start: '6:00 PM',
    end: '7:00 PM',
    trackId: 'aiml',
    track: 'AIML',
    phase: 'Phase 2',
    module: 'Module 3',
    topicIndex: 'Topic 4',
    title: 'Neural Networks',
    status: 'in-progress',
    prerequisites: [
      { name: 'Perceptron', done: true },
      { name: 'Activation Functions', done: true },
      { name: 'Gradient Descent', done: true },
    ],
    concepts: ['Definition', 'Mechanism', 'Example', 'Limitations'],
    history: [{ date: '2026-09-28', label: 'Scheduled', outcome: 'open' }],
    mastery: 'locked',
  },
  {
    id: 't-impl-model-training',
    kind: 'study',
    start: '7:00 PM',
    end: '8:00 PM',
    trackId: 'impl',
    track: 'Implementation',
    phase: 'Phase 1',
    module: 'Module 2',
    topicIndex: 'Topic 3',
    title: 'Model Training',
    status: 'upcoming',
    prerequisites: [
      { name: 'Data Loaders', done: true },
      { name: 'Neural Networks', done: false },
    ],
    concepts: ['Training loop', 'Loss tracking', 'Validation', 'Checkpoints'],
    history: [{ date: '2026-09-28', label: 'Scheduled', outcome: 'open' }],
    mastery: 'locked',
  },
  {
    id: 't-research-benchmark',
    kind: 'study',
    start: '8:00 PM',
    end: '9:00 PM',
    trackId: 'research',
    track: 'Research',
    phase: 'Phase 1',
    module: 'Module 1',
    topicIndex: 'Topic 3',
    title: 'Benchmark',
    status: 'carried',
    prerequisites: [
      { name: 'Literature Review', done: true },
      { name: 'Research Question', done: true },
    ],
    concepts: ['Baselines', 'Datasets', 'Metrics', 'Comparison'],
    history: [
      { date: '2026-09-26', label: 'Scheduled', outcome: 'not-completed' },
      { date: '2026-09-27', label: 'Carried Forward', outcome: 'not-completed' },
      { date: '2026-09-28', label: 'Carried Forward', outcome: 'open' },
    ],
    mastery: 'locked',
  },
]

/* ------------------------------------------------------------------ */
/* Tracks                                                              */
/* ------------------------------------------------------------------ */

export type TopicStatus = 'done' | 'current' | 'todo'
export type Topic = {
  id: string
  name: string
  status: TopicStatus
  taskId?: string
  mastered?: boolean
}
export type Module = { id: string; label: string; name: string; topics: Topic[] }
export type Phase = { id: string; label: string; name: string; modules: Module[] }

export type InterviewItem = {
  type: 'Theory' | 'Practice' | 'Question' | 'Revision' | 'Mock Interview'
  title: string
  status: TopicStatus
}

export type Track = {
  id: string
  name: string
  fullName: string
  phase: string
  module: string
  current: string
  progress: number
  kind: 'standard' | 'research' | 'interview'
  phases: Phase[]
  interview?: InterviewItem[]
}

const t = (
  name: string,
  status: TopicStatus,
  extra: Partial<Topic> = {},
): Topic => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  status,
  ...extra,
})

export const TRACKS: Track[] = [
  {
    id: 'dsa',
    name: 'DSA',
    fullName: 'Data Structures & Algorithms',
    phase: 'Phase 2',
    module: 'Module 4',
    current: 'Binary Search',
    progress: 78,
    kind: 'standard',
    phases: [
      {
        id: 'p1',
        label: 'Phase 1',
        name: 'Foundations',
        modules: [
          {
            id: 'm1',
            label: 'Module 1',
            name: 'Arrays',
            topics: [
              t('Arrays', 'done', { mastered: true }),
              t('Two Pointers', 'done', { mastered: true }),
              t('Sliding Window', 'done', { mastered: true }),
            ],
          },
          {
            id: 'm2',
            label: 'Module 2',
            name: 'Strings',
            topics: [
              t('String Basics', 'done', { mastered: true }),
              t('Pattern Matching', 'done'),
            ],
          },
        ],
      },
      {
        id: 'p2',
        label: 'Phase 2',
        name: 'Core Techniques',
        modules: [
          {
            id: 'm3',
            label: 'Module 3',
            name: 'Sorting',
            topics: [
              t('Sorting Basics', 'done', { mastered: true }),
              t('Merge Sort', 'done', { mastered: true }),
              t('Quick Sort', 'done'),
            ],
          },
          {
            id: 'm4',
            label: 'Module 4',
            name: 'Searching',
            topics: [
              t('Linear Search', 'done', { mastered: true }),
              t('Binary Search', 'done', { taskId: 't-dsa-binary-search' }),
              t('Search on Answer', 'todo'),
              t('Ternary Search', 'todo'),
            ],
          },
        ],
      },
    ],
    interview: [
      { type: 'Theory', title: 'Time & space complexity', status: 'done' },
      { type: 'Practice', title: 'Binary search variants', status: 'current' },
      { type: 'Question', title: 'Find first bad version', status: 'todo' },
      { type: 'Revision', title: 'Searching module recap', status: 'todo' },
      { type: 'Mock Interview', title: 'Arrays & searching', status: 'todo' },
    ],
  },
  {
    id: 'aiml',
    name: 'AIML',
    fullName: 'Artificial Intelligence & Machine Learning',
    phase: 'Phase 2',
    module: 'Module 3',
    current: 'Neural Networks',
    progress: 64,
    kind: 'standard',
    phases: [
      {
        id: 'p1',
        label: 'Phase 1',
        name: 'Foundations',
        modules: [
          {
            id: 'm1',
            label: 'Module 1',
            name: 'Mathematics',
            topics: [
              t('Vectors & Matrices', 'done', { mastered: true }),
              t('Linear Algebra', 'done', { mastered: true }),
              t('Probability', 'done', { mastered: true }),
              t('Statistics', 'done'),
              t('Calculus', 'done', { mastered: true }),
              t('Optimization', 'done'),
            ],
          },
          {
            id: 'm2',
            label: 'Module 2',
            name: 'Classical ML',
            topics: [
              t('Linear Regression', 'done', { mastered: true }),
              t('Logistic Regression', 'done', { mastered: true }),
              t('k-Nearest Neighbors', 'done'),
              t('Decision Trees', 'done', { mastered: true }),
              t('Ensembles', 'done'),
              t('Support Vector Machines', 'done'),
              t('Clustering', 'done', { mastered: true }),
              t('Dimensionality Reduction', 'done'),
              t('Evaluation Metrics', 'done', { mastered: true }),
            ],
          },
        ],
      },
      {
        id: 'p2',
        label: 'Phase 2',
        name: 'Neural Foundations',
        modules: [
          {
            id: 'm3',
            label: 'Module 3',
            name: 'Neural Networks',
            topics: [
              t('Perceptron', 'done', { mastered: true }),
              t('Activation Functions', 'done'),
              t('Gradient Descent', 'done', { mastered: true }),
              t('Neural Networks', 'current', { taskId: 't-aiml-neural-networks' }),
              t('Backpropagation', 'todo'),
              t('Loss Functions', 'todo'),
            ],
          },
        ],
      },
      {
        id: 'p3',
        label: 'Phase 3',
        name: 'Deep Architectures',
        modules: [
          {
            id: 'm4',
            label: 'Module 4',
            name: 'Architectures',
            topics: [
              t('Convolutional Networks', 'todo'),
              t('Recurrent Networks', 'todo'),
              t('Attention', 'todo'),
              t('Transformers', 'todo'),
            ],
          },
        ],
      },
    ],
    interview: [
      { type: 'Theory', title: 'Bias–variance trade-off', status: 'done' },
      { type: 'Practice', title: 'Implement a perceptron', status: 'done' },
      { type: 'Question', title: 'Why do we need non-linearity?', status: 'current' },
      { type: 'Revision', title: 'Module 3 recap', status: 'todo' },
      { type: 'Mock Interview', title: 'ML fundamentals', status: 'todo' },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    fullName: 'Research Practice',
    phase: 'Phase 1',
    module: 'Module 1',
    current: 'Benchmark',
    progress: 42,
    kind: 'research',
    phases: [
      {
        id: 'p1',
        label: 'Phase 1',
        name: 'First Study',
        modules: [
          {
            id: 'm1',
            label: 'Module 1',
            name: 'Research Cycle',
            topics: [
              t('Literature Review', 'done'),
              t('Research Question', 'done'),
              t('Benchmark', 'current', { taskId: 't-research-benchmark' }),
              t('Experiment', 'todo'),
              t('Analysis', 'todo'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'impl',
    name: 'Implementation',
    fullName: 'Implementation Lab',
    phase: 'Phase 1',
    module: 'Module 2',
    current: 'Model Training',
    progress: 55,
    kind: 'standard',
    phases: [
      {
        id: 'p1',
        label: 'Phase 1',
        name: 'Building Blocks',
        modules: [
          {
            id: 'm1',
            label: 'Module 1',
            name: 'Data',
            topics: [t('Datasets', 'done'), t('Data Loaders', 'done')],
          },
          {
            id: 'm2',
            label: 'Module 2',
            name: 'Training',
            topics: [
              t('Model Setup', 'done'),
              t('Loss & Optimizers', 'done'),
              t('Model Training', 'current', { taskId: 't-impl-model-training' }),
              t('Evaluation Loop', 'todo'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'interview',
    name: 'Interview',
    fullName: 'Interview Preparation',
    phase: 'Phase 2',
    module: 'Module 2',
    current: 'Behavioral Stories',
    progress: 80,
    kind: 'interview',
    phases: [
      {
        id: 'p1',
        label: 'Phase 1',
        name: 'Groundwork',
        modules: [
          {
            id: 'm1',
            label: 'Module 1',
            name: 'Fundamentals',
            topics: [
              t('Resume Walkthrough', 'done'),
              t('Problem Solving Framework', 'done'),
              t('Communication', 'done'),
            ],
          },
        ],
      },
      {
        id: 'p2',
        label: 'Phase 2',
        name: 'Practice',
        modules: [
          {
            id: 'm2',
            label: 'Module 2',
            name: 'Rounds',
            topics: [
              t('Technical Rounds', 'done'),
              t('Behavioral Stories', 'current'),
              t('System Design Basics', 'todo'),
            ],
          },
        ],
      },
    ],
    interview: [
      { type: 'Theory', title: 'STAR method', status: 'done' },
      { type: 'Practice', title: 'Two technical problems', status: 'done' },
      { type: 'Question', title: 'Tell me about a hard bug', status: 'current' },
      { type: 'Revision', title: 'Story bank review', status: 'todo' },
      { type: 'Mock Interview', title: 'Full loop rehearsal', status: 'todo' },
    ],
  },
  {
    id: 'systems',
    name: 'Systems',
    fullName: 'Computer Systems',
    phase: 'Phase 1',
    module: 'Module 2',
    current: 'Processes & Threads',
    progress: 36,
    kind: 'standard',
    phases: [
      {
        id: 'p1',
        label: 'Phase 1',
        name: 'Operating Systems',
        modules: [
          {
            id: 'm1',
            label: 'Module 1',
            name: 'Basics',
            topics: [t('What an OS does', 'done'), t('System Calls', 'done')],
          },
          {
            id: 'm2',
            label: 'Module 2',
            name: 'Concurrency',
            topics: [
              t('Processes & Threads', 'current'),
              t('Scheduling', 'todo'),
              t('Synchronization', 'todo'),
            ],
          },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Mastery chart                                                       */
/* ------------------------------------------------------------------ */

export type MasteryPoint = {
  date: string
  label: string
  day: string
  score: number
  evaluations: number
  passed: number
  mastered: number
}

export const MASTERY_SERIES: MasteryPoint[] = [
  { date: 'September 22', label: 'Sep 22', day: 'Tuesday', score: 72, evaluations: 4, passed: 3, mastered: 12 },
  { date: 'September 23', label: 'Sep 23', day: 'Wednesday', score: 76, evaluations: 5, passed: 4, mastered: 13 },
  { date: 'September 24', label: 'Sep 24', day: 'Thursday', score: 74, evaluations: 3, passed: 2, mastered: 14 },
  { date: 'September 25', label: 'Sep 25', day: 'Friday', score: 79, evaluations: 6, passed: 5, mastered: 15 },
  { date: 'September 26', label: 'Sep 26', day: 'Saturday', score: 84, evaluations: 4, passed: 4, mastered: 16 },
  { date: 'September 27', label: 'Sep 27', day: 'Sunday', score: 78, evaluations: 3, passed: 2, mastered: 17 },
  { date: 'September 28', label: 'Sep 28', day: 'Monday', score: 81, evaluations: 5, passed: 4, mastered: 18 },
]

export const MASTERY_TARGET = 75

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export type Achievement = {
  id: string
  title: string
  description: string
  earned?: string
  icon: 'step' | 'streak' | 'mastery' | 'module' | 'comeback' | 'week'
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', title: 'First Step', description: 'Completed your very first task.', earned: 'Jul 22', icon: 'step' },
  { id: 'streak-7', title: '7 Day Streak', description: 'Showed up for 7 consecutive days.', earned: 'Aug 17', icon: 'streak' },
  { id: 'streak-30', title: '30 Day Streak', description: 'Showed up for 30 consecutive days.', earned: 'Sep 9', icon: 'streak' },
  { id: 'streak-50', title: '50 Day Streak', description: 'Showed up for 50 consecutive days.', icon: 'streak' },
  { id: 'streak-100', title: '100 Day Streak', description: 'Showed up for 100 consecutive days.', icon: 'streak' },
  { id: 'first-mastery', title: 'First Mastery', description: 'Passed your first mastery check.', earned: 'Aug 2', icon: 'mastery' },
  { id: 'mastered-10', title: '10 Topics Mastered', description: 'Mastered ten topics across tracks.', earned: 'Sep 14', icon: 'mastery' },
  { id: 'full-module', title: 'Full Module', description: 'Completed every topic in a module.', earned: 'Sep 3', icon: 'module' },
  { id: 'comeback', title: 'Comeback', description: 'Finished a task that was carried forward.', earned: 'Aug 30', icon: 'comeback' },
  { id: 'consistent-week', title: 'Consistent Week', description: 'Completed every task for a full week.', earned: 'Sep 20', icon: 'week' },
]

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationItem = {
  id: string
  kind: 'notes' | 'carried' | 'mastery' | 'achievement'
  title: string
  subject: string
  time: string
  taskId?: string
  unread: boolean
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', kind: 'notes', title: 'Notes required', subject: 'Neural Networks', time: '6:02 PM', taskId: 't-aiml-neural-networks', unread: true },
  { id: 'n2', kind: 'carried', title: 'Task carried forward', subject: 'Research Benchmark', time: '12:00 AM', taskId: 't-research-benchmark', unread: true },
  { id: 'n3', kind: 'mastery', title: 'Mastery ready', subject: 'Binary Search', time: '4:53 PM', taskId: 't-dsa-binary-search', unread: false },
  { id: 'n4', kind: 'achievement', title: 'New achievement', subject: 'Consistent Week', time: 'Sep 20', unread: false },
]

/* ------------------------------------------------------------------ */
/* Import preview (generic sample structure)                           */
/* ------------------------------------------------------------------ */

export const IMPORT_STATS = [
  { label: 'Tracks', value: 6 },
  { label: 'Modules', value: 32 },
  { label: 'Topics', value: 184 },
  { label: 'Tasks', value: 391 },
  { label: 'Prerequisites', value: 74 },
]

export const IMPORT_TREE = [
  {
    name: 'DSA',
    phases: [
      { name: 'Phase 1', modules: [{ name: 'Module 1', topics: ['Topic 1', 'Topic 2', 'Topic 3'] }, { name: 'Module 2', topics: ['Topic 4', 'Topic 5'] }] },
      { name: 'Phase 2', modules: [{ name: 'Module 3', topics: ['Topic 6', 'Topic 7'] }] },
    ],
  },
  {
    name: 'AIML',
    phases: [
      { name: 'Phase 1', modules: [{ name: 'Module 1', topics: ['Topic 1', 'Topic 2', 'Topic 3'] }] },
      { name: 'Phase 2', modules: [{ name: 'Module 2', topics: ['Topic 4', 'Topic 5', 'Topic 6'] }] },
    ],
  },
  {
    name: 'Track Alpha',
    phases: [{ name: 'Phase 1', modules: [{ name: 'Module 1', topics: ['Topic 1', 'Topic 2'] }] }],
  },
  {
    name: 'Research',
    phases: [{ name: 'Phase 1', modules: [{ name: 'Module 1', topics: ['Topic 1', 'Topic 2', 'Topic 3'] }] }],
  },
]

export const PLAN_REFERENCES = {
  schedule: { version: 2, fileName: 'Schedule_Reference_v2.pdf', updated: 'Sep 12' },
  topics: { version: 1, fileName: 'Topic_Reference_v1.pdf', updated: 'Jul 20' },
}

export const PLAN_DIFF = [
  { label: 'Topics', from: 184, to: 191 },
  { label: 'Modules', from: 32, to: 34 },
  { label: 'Schedule Rules', from: 12, to: 14 },
]
