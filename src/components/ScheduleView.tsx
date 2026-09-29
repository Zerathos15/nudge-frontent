import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api.ts';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
  RefreshCw,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ScheduledTask } from '../types.ts';

interface ScheduleViewProps {
  onOpenEvidence: (task: ScheduledTask) => void;
  onOpenMastery: (task: ScheduledTask) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onOpenEvidence,
  onOpenMastery,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [daySchedule, setDaySchedule] = useState<{
    date: string;
    dayType: string;
    tasks: ScheduledTask[];
    conflict: boolean;
    conflictDetails?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSchedule = async (date: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/schedule/day?date=${date}`);

      if (res.ok) {
        const data = await res.json();
        setDaySchedule(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetStatus = async (taskId: string, status: string) => {
    try {
      setActionLoading(taskId);
      const res = await apiFetch(`/api/schedule/task/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchSchedule(selectedDate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0];

      const res = await apiFetch(`/api/schedule/task/${taskId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: nextDate }),
      });

      if (res.ok) {
        fetchSchedule(selectedDate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDayType = (type: string) => {
    switch (type) {
      case 'WEEKDAY':
        return 'Weekday (Post-College 4:00 PM – 11:00 PM, Max 1-Hour Blocks)';
      case 'SATURDAY_WORKING':
        return 'Saturday (Working College Day - Weekday Schedule)';
      case 'SATURDAY_OFF':
        return 'Saturday (Non-Working - 11:00 AM Start, 8 Focused Study Hours)';
      case 'SUNDAY':
        return 'Sunday (Milestone, Deep Work & Mastery - 11:00 AM Start, 8 Hours)';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Date Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
          >
            Today
          </button>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Schedule Authority Blueprint
          </div>
          <div className="text-xs sm:text-sm font-medium text-indigo-300">
            {daySchedule ? formatDayType(daySchedule.dayType) : 'Evaluating rules...'}
          </div>
        </div>
      </div>

      {/* Conflict or Backlog Notice */}
      {daySchedule?.conflict && (
        <div className="p-4 rounded-xl bg-orange-950/60 border border-orange-800/80 flex items-start space-x-3 text-orange-200">
          <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-orange-300">Schedule Capacity Warning</div>
            <div className="text-xs sm:text-sm text-orange-200/90 mt-0.5">
              {daySchedule.conflictDetails ||
                'Unfinished tasks rolled over exceed the daily slot availability while respecting maximum 1-hour focus limits.'}
            </div>
          </div>
        </div>
      )}

      {/* Daily Timeline */}
      {loading ? (
        <div className="py-20 flex justify-center items-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
          <span>Computing schedule slots from PDF rules...</span>
        </div>
      ) : daySchedule?.tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <Clock className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-300">No Study Blocks Scheduled For This Date</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Schedule slots are automatically derived from the active Schedule and Curriculum PDFs according to college timing and track rotation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {daySchedule?.tasks.map((task, idx) => {
            const isCompleted = task.status === 'STUDIED' || task.status === 'MASTERED';
            const isMastered = task.status === 'MASTERED';
            const isBlocked = task.status === 'BLOCKED';

            return (
              <React.Fragment key={task.id}>
                {/* Break Indicator between blocks */}
                {idx > 0 && (
                  <div className="flex items-center space-x-3 py-1 px-4 text-xs font-mono text-slate-500">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800/80">
                      <Coffee className="w-3.5 h-3.5 text-amber-500" />
                      <span>15 Min Mandatory Continuous Focus Break</span>
                    </div>
                    <div className="h-px bg-slate-800 flex-1"></div>
                  </div>
                )}

                {/* Study Block Card */}
                <div
                  className={`rounded-2xl border transition p-5 sm:p-6 ${
                    isMastered
                      ? 'bg-slate-900/90 border-emerald-900/60'
                      : isCompleted
                      ? 'bg-slate-900/90 border-sky-900/60'
                      : isBlocked
                      ? 'bg-slate-900/60 border-rose-900/60 opacity-80'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Time & Track */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-800/50">
                          {task.scheduled_slot_start} – {task.scheduled_slot_end}
                        </span>
                        <span
                          className="text-xs font-bold px-2.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: task.track_color || '#4f46e5' }}
                        >
                          {task.track_key}
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-semibold">
                          {task.topic_code}
                        </span>
                        {task.rescheduled_date && (
                          <span className="text-[11px] font-semibold text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-800">
                            Rolled over from {task.original_date}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {task.topic_title}
                      </h3>

                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <span>{task.module_title}</span>
                        <span>•</span>
                        <span className="uppercase font-semibold text-indigo-300 font-mono">
                          {task.task_type}
                        </span>
                        {task.requires_mastery && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium flex items-center space-x-1">
                              <Award className="w-3.5 h-3.5" />
                              <span>Mastery Gate</span>
                            </span>
                          </>
                        )}
                      </div>

                      {task.topic_description && (
                        <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
                          {task.topic_description}
                        </p>
                      )}

                      {isBlocked && (
                        <div className="mt-2 text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-lg border border-rose-800 flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            Prerequisite Blocked: You must complete and master prior prerequisite topics before studying this.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                      {isMastered ? (
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Topic Mastered</span>
                        </div>
                      ) : isCompleted ? (
                        <div className="space-y-2 text-right">
                          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-950 border border-sky-800 text-sky-300 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Studied (Evidence Validated)</span>
                          </div>
                          {task.requires_mastery && (
                            <button
                              onClick={() => onOpenMastery(task)}
                              className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Take Mastery Quiz</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {task.status !== 'IN_PROGRESS' && !isBlocked && (
                            <button
                              onClick={() => handleSetStatus(task.id, 'IN_PROGRESS')}
                              disabled={actionLoading === task.id}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
                            >
                              <Play className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Start</span>
                            </button>
                          )}

                          {!isBlocked && (
                            <button
                              onClick={() => onOpenEvidence(task)}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Submit Proof</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleReschedule(task.id)}
                            disabled={actionLoading === task.id}
                            title="Reschedule to next available slot"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
