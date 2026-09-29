import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, Lock, Award, Clock, ArrowRight, Layers } from 'lucide-react';
import { TrackCheckpoint } from '../types.ts';
import { apiFetch } from '../api.ts';

interface CheckpointsViewProps {
  onOpenEvidenceForTopic?: (topic: any) => void;
}

export const CheckpointsView: React.FC<CheckpointsViewProps> = () => {
  const [checkpoints, setCheckpoints] = useState<TrackCheckpoint[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCheckpoints = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/schedule/checkpoints');

      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints || []);
        if (data.checkpoints?.length > 0 && !selectedTrack) {
          setSelectedTrack(data.checkpoints[0].track_key);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>Loading persistent track checkpoints...</span>
      </div>
    );
  }

  const activeCp = checkpoints.find((c) => c.track_key === selectedTrack);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Track Checkpoints & Mastery State
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Every track maintains its own isolated, persistent state. When you complete a block or session, your checkpoint pointer resumes exactly at your next eligible topic.
        </p>
      </div>

      {/* Track Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-none border-b border-slate-800">
        {checkpoints.map((cp) => {
          const isSelected = cp.track_key === selectedTrack;
          const total = cp.completed_count + cp.remaining_count;
          const pct = total > 0 ? Math.round((cp.completed_count / total) * 100) : 0;

          return (
            <button
              key={cp.id}
              onClick={() => setSelectedTrack(cp.track_key)}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-slate-800 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cp.track_color || '#4f46e5' }}
              ></span>
              <span>{cp.track_title}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 font-mono text-slate-400">
                {pct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Track Details */}
      {activeCp ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Track Progression</div>
              <div className="text-2xl font-bold text-white mt-1">
                {activeCp.completed_count} / {activeCp.completed_count + activeCp.remaining_count} Topics
              </div>
              <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      activeCp.completed_count + activeCp.remaining_count > 0
                        ? Math.round(
                            (activeCp.completed_count /
                              (activeCp.completed_count + activeCp.remaining_count)) *
                              100
                          )
                        : 0
                    }%`,
                    backgroundColor: activeCp.track_color || '#4f46e5',
                  }}
                ></div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="text-xs text-indigo-400 uppercase tracking-wider font-bold">
                  Current Checkpoint Pointer
                </div>
                {activeCp.current_topic_info ? (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {activeCp.current_topic_info.code}
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {activeCp.current_topic_info.title}
                      </h4>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Module: {activeCp.current_topic_info.module_title}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-emerald-400 mt-2">
                    All topics in this track completed!
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-mono mt-3">
                Last Checkpoint Sync: {new Date(activeCp.updated_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Checkpoint Rule Enforcements</span>
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-slate-300">Strict Sequential Gates:</strong> Topics cannot be skipped. Downstream topics remain blocked until upstream prerequisites have proof of study and passed mastery.
              </li>
              <li>
                <strong className="text-slate-300">Continuous Resumption:</strong> Leaving the app and returning will always point directly to this exact topic.
              </li>
              <li>
                <strong className="text-slate-300">Curriculum Version Preservation:</strong> New PDF versions maintain historical records for previous modules without destroying your completed checkpoints.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          No track data available. Please ensure curriculum PDFs are ingested.
        </div>
      )}
    </div>
  );
};
