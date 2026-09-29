import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../api.ts';
import {
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Calendar,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ScheduledTask, TrackCheckpoint } from '../types.ts';

interface DashboardViewProps {
  onNavigate: (tab: string, context?: any) => void;
  onOpenEvidence: (task: ScheduledTask) => void;
  onOpenMastery: (task: ScheduledTask) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenEvidence,
  onOpenMastery,
}) => {
  const { user, activeCurriculum, activeSchedule } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<ScheduledTask[]>([]);
  const [checkpoints, setCheckpoints] = useState<TrackCheckpoint[]>([]);
  const [dailyMasteryProgress, setDailyMasteryProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [resOverview, resCp] = await Promise.all([
        apiFetch('/api/schedule/overview'),
        apiFetch('/api/schedule/checkpoints'),
      ]);

      if (resOverview.ok) {
        const d = await resOverview.json();
        setMetrics(d.metrics);
        setTodayTasks(d.todayTasks || []);
        setDailyMasteryProgress(d.dailyMasteryProgress || []);
      }

      if (resCp.ok) {
        const cpData = await resCp.json();
        setCheckpoints(cpData.checkpoints || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MASTERED':
        return <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Mastered</span>;
      case 'STUDIED':
        return <span className="bg-sky-950 text-sky-300 border border-sky-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Studied</span>;
      case 'IN_PROGRESS':
        return <span className="bg-amber-950 text-amber-300 border border-amber-800 text-xs px-2.5 py-0.5 rounded-full font-medium">In Progress</span>;
      case 'RESCHEDULED':
        return <span className="bg-orange-950 text-orange-300 border border-orange-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Rescheduled</span>;
      case 'BLOCKED':
        return <span className="bg-rose-950 text-rose-300 border border-rose-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Prerequisite Blocked</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">Not Started</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center space-x-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading your personalized mastery environment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-800/40 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Keep Moving forward</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Curriculum is derived strictly from your authoritative PDF references. Every track maintains an independent, persistent checkpoint with mandatory evidence and mastery gates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('schedule')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
            >
              <Calendar className="w-4 h-4" />
              <span>Today's Schedule</span>
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition"
              >
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span>Manage Curriculum PDFs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum / Schedule Warning if uninitialized */}
      {(!activeCurriculum || !activeSchedule) && (
        <div className="rounded-xl bg-amber-950/40 border border-amber-800/60 p-5 flex items-start space-x-4 text-amber-200">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-300">No Active Curriculum or Schedule PDF Activated</h3>
            <p className="text-xs sm:text-sm text-amber-200/80 mt-1">
              The application engine does not use hardcoded roadmaps. An administrator must ingest and activate the Schedule Reference PDF and Topic / Task Reference PDF.
            </p>
            {user?.role === 'ADMIN' ? (
              <button
                onClick={() => onNavigate('admin')}
                className="mt-3 text-xs inline-flex items-center space-x-1.5 font-bold text-amber-300 hover:text-white bg-amber-900/60 hover:bg-amber-800 px-3 py-1.5 rounded-lg border border-amber-700"
              >
                <span>Open PDF Ingestion Panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <p className="text-xs text-amber-300/70 mt-2 italic">
                Please ask the system administrator to upload and activate the curriculum PDFs.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Backlog / Rescheduled Task Notice */}
      {metrics?.rescheduledPending > 0 && (
        <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/60 p-4 flex items-center justify-between text-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/80 flex items-center justify-center text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">
                {metrics.rescheduledPending} Incomplete Tasks Rolled Over
              </div>
              <div className="text-xs text-slate-400">
                Unfinished work automatically preserves original dates and is prioritized in available 1-hour slots without overloading your schedule.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('schedule')}
            className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold px-3 py-1.5 rounded bg-indigo-900/50 border border-indigo-700"
          >
            Review Slots
          </button>
        </div>
      )}

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-400">Today's Focus Slots</div>
          <div className="text-2xl font-bold text-white mt-1">
            {metrics?.todayCompleted || 0} / {metrics?.todayTotal || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Max 1-hr continuous blocks</div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-400">Topics Studied (Evidence Validated)</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{metrics?.totalStudied || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Backed by verified notes/PDFs</div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-400">Mastered Topics</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics?.totalMastered || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Passed mastery assessment (≥75%)</div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-400">Active Curriculum Version</div>
          <div className="text-xl font-bold text-indigo-300 mt-1 truncate">
            {activeCurriculum ? activeCurriculum.version_number : 'v0.0'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Authoritative PDF blueprint</div>
        </div>
      </div>

      {/* 7-Day Daily Mastery Score Progress Line Chart (Recharts) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Performance Analytics</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Daily Mastery Score Progress (Last 7 Days)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks your verified daily mastery evaluation scores (0–100%) and progression over time
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-right">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Latest Score</div>
              <div className="text-sm font-bold text-indigo-300 font-mono">
                {dailyMasteryProgress.length > 0
                  ? `${dailyMasteryProgress[dailyMasteryProgress.length - 1].score}%`
                  : '0%'}
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-right">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">7-Day Peak</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {dailyMasteryProgress.length > 0
                  ? `${Math.max(...dailyMasteryProgress.map((d) => d.score || 0))}%`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>

        {/* Recharts Line Chart Container */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyMasteryProgress}
              margin={{ top: 12, right: 24, left: -10, bottom: 8 }}
            >
              <defs>
                <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="dayOfWeek"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                domain={[0, 100]}
                unit="%"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700/90 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-bold text-white text-sm border-b border-slate-800 pb-1.5 flex items-center justify-between">
                          <span>{data.label}</span>
                          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                            {data.date}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-300 pt-0.5">
                          <span>Mastery Score:</span>
                          <span className="font-extrabold text-white text-sm font-mono">{data.score}%</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Tests Completed:</span>
                          <span className="font-semibold text-slate-200">{data.testsCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Passed Tests:</span>
                          <span className="font-semibold text-emerald-300">{data.passedCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-800">
                          <span>Cumulative Mastered:</span>
                          <span className="font-bold text-indigo-400">{data.cumulativeMastered} topics</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#94a3b8' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Mastery Score (%)"
                stroke="url(#scoreLineGradient)"
                strokeWidth={3}
                dot={{
                  r: 4.5,
                  fill: '#6366f1',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: '#a855f7',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Target benchmark: ≥ 75% for topic mastery certification</span>
          </div>
          <div>
            Scores automatically update when completing topic mastery evaluations.
          </div>
        </div>
      </div>

      {/* Track Checkpoints */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Track Checkpoints</h2>
          </div>
          <button
            onClick={() => onNavigate('checkpoints')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
          >
            <span>Full Curriculum Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {checkpoints.map((cp) => {
            const total = cp.completed_count + cp.remaining_count;
            const pct = total > 0 ? Math.round((cp.completed_count / total) * 100) : 0;
            return (
              <div
                key={cp.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: cp.track_color || '#4f46e5' }}
                    >
                      {cp.track_key}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{pct}% Complete</span>
                  </div>

                  <h3 className="font-semibold text-slate-100 text-sm mt-3">{cp.track_title}</h3>

                  {cp.current_topic_info ? (
                    <div className="mt-3 p-3 rounded-lg bg-slate-800/70 border border-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Next Eligible Focus
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                        {cp.current_topic_info.code}: {cp.current_topic_info.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {cp.current_topic_info.module_title}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 rounded-lg bg-slate-800/40 text-xs text-slate-500 italic">
                      All track topics mastered
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cp.track_color || '#4f46e5',
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
                    <span>{cp.completed_count} completed</span>
                    <span>{cp.remaining_count} remaining</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Schedule Timeline Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Today's Focus Schedule</h2>
          </div>
          <button
            onClick={() => onNavigate('schedule')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
          >
            <span>Interactive Timetable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center text-slate-400">
            <Clock className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <div className="font-semibold text-slate-300">No scheduled study blocks for today</div>
            <p className="text-xs text-slate-500 mt-1">
              Ensure active curriculum and schedule PDFs are uploaded. Weekday slots start after college ending time.
            </p>
            <button
              onClick={() => onNavigate('schedule')}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Generate Daily Schedule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTasks.map((t) => (
              <div
                key={t.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-indigo-400 font-semibold">
                      {t.scheduled_slot_start} – {t.scheduled_slot_end} (1 hr)
                    </span>
                    {getStatusBadge(t.status)}
                  </div>

                  <div className="mt-3 flex items-center space-x-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: t.track_color || '#4f46e5' }}
                    >
                      {t.track_key}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{t.topic_code}</span>
                  </div>

                  <h4 className="font-semibold text-slate-100 text-sm mt-1">{t.topic_title}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.module_title}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    {t.task_type}
                  </span>

                  <div className="flex items-center space-x-2">
                    {t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS' || t.status === 'RESCHEDULED' ? (
                      <button
                        onClick={() => onOpenEvidence(t)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                      >
                        Submit Evidence
                      </button>
                    ) : t.status === 'STUDIED' && t.requires_mastery ? (
                      <button
                        onClick={() => onOpenMastery(t)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                      >
                        Take Mastery Test
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
