import React, { useState, useEffect } from 'react';
import { FlaskConical, Plus, CheckCircle2, Clock, FileText } from 'lucide-react';
import { ResearchMilestone } from '../types.ts';
import { apiFetch } from '../api.ts';

export const ResearchView: React.FC = () => {
  const [milestones, setMilestones] = useState<ResearchMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [paperOrExperiment, setPaperOrExperiment] = useState('');
  const [stage, setStage] = useState('LITERATURE_REVIEW');
  const [notes, setNotes] = useState('');

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/research/milestones');

      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/research/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          paper_or_experiment: paperOrExperiment,
          stage,
          notes,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setTitle('');
        setPaperOrExperiment('');
        setNotes('');
        fetchMilestones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const STAGES = [
    { key: 'LITERATURE_REVIEW', label: '1. Literature Review' },
    { key: 'RESEARCH_QUESTION', label: '2. Research Question' },
    { key: 'BENCHMARK', label: '3. Benchmark & Metrics' },
    { key: 'BASELINE', label: '4. Baseline Reproduction' },
    { key: 'EXPERIMENT', label: '5. Novel Experimentation' },
    { key: 'ABLATION', label: '6. Ablation Studies' },
    { key: 'ANALYSIS', label: '7. Empirical Analysis' },
    { key: 'PAPER_WRITING', label: '8. Paper Writing & Defense' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Research & Lyn Engineering Milestones
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track deep academic papers, benchmark baselines, ablation studies, and system implementations.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Research Milestone</span>
        </button>
      </div>

      {isAddOpen && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Create Research Tracker</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Milestone Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Speculative Decoding Latency Benchmark"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paper / System Focus
              </label>
              <input
                type="text"
                required
                value={paperOrExperiment}
                onChange={(e) => setPaperOrExperiment(e.target.value)}
                placeholder="e.g. Lyn Zero-Copy Ingestion Engine"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Scientific Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Experimental Observations / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key hypotheses or baseline metrics observed..."
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Save Milestone
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading research milestones...</div>
      ) : milestones.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <FlaskConical className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h4 className="font-bold text-slate-300">No Research Milestones Registered</h4>
          <p className="text-xs text-slate-500 mt-1">
            Register your literature surveys, ablation runs, and baseline experiments here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                  {m.stage.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">{m.title}</h4>
                <div className="text-xs font-medium text-slate-400 mt-0.5">
                  Focus: {m.paper_or_experiment}
                </div>
              </div>

              {m.notes && (
                <p className="text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  {m.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
