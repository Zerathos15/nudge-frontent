import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api.ts';
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Sparkles,
  Award,
  ChevronDown,
} from 'lucide-react';
import { EvidenceRecord, ScheduledTask } from '../types.ts';

interface EvidenceViewProps {
  initialTask?: ScheduledTask | null;
  onCloseSubmit?: () => void;
  onOpenMasteryForTask?: (task: ScheduledTask) => void;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  initialTask,
  onCloseSubmit,
  onOpenMasteryForTask,
}) => {
  const [library, setLibrary] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');

  // Submit form state
  const [isSubmitOpen, setIsSubmitOpen] = useState(Boolean(initialTask));
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(initialTask || null);
  const [userNotes, setUserNotes] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [selectedEvidenceDetail, setSelectedEvidenceDetail] = useState<EvidenceRecord | null>(null);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (trackFilter) params.append('track', trackFilter);

      const res = await apiFetch(`/api/evidence/library?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setLibrary(data.library || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [search, statusFilter, trackFilter]);

  useEffect(() => {
    if (initialTask) {
      setSelectedTask(initialTask);
      setIsSubmitOpen(true);
    }
  }, [initialTask]);

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (!userNotes.trim() && !pdfFile) {
      alert('Please provide detailed study notes or attach a PDF evidence document.');
      return;
    }

    try {
      setSubmitting(true);
      setEvaluationResult(null);

      const formData = new FormData();
      formData.append('taskId', selectedTask.id);
      formData.append('topicId', selectedTask.topic_id);
      formData.append('userNotes', userNotes);
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const res = await apiFetch('/api/evidence/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setEvaluationResult(data.evaluation);
      fetchLibrary();
    } catch (err: any) {
      alert(err.message || 'Evidence submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvidence = async (id: string) => {
    if (!confirm('Are you sure you want to delete this evidence record?')) return;
    try {
      const res = await apiFetch(`/api/evidence/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchLibrary();
        if (selectedEvidenceDetail?.id === id) {
          setSelectedEvidenceDetail(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTopicGuidance = (trackKey: string = '') => {
    const key = trackKey.toUpperCase();
    if (key.includes('DSA')) {
      return [
        'Problem statement & bounds',
        'Intuition & Approach',
        'Why it works logically',
        'Time & Space Complexity',
        'Dry run with example test cases',
        'Edge cases (e.g. empty, duplicates, overflow)',
        'Implementation code / pseudocode',
      ];
    }
    if (key.includes('AIML')) {
      return [
        'Formal definition & core mechanism',
        'Mathematical formulation (e.g. attention matrices, loss)',
        'Concrete working example',
        'Trade-offs, advantages & limitations',
        'Alternatives comparison',
        'Applicability to Lyn system / real pipelines',
        'Technical interview questions answered',
      ];
    }
    if (key.includes('LYN')) {
      return [
        'Module scope & implemented feature',
        'Architecture & component interactions',
        'Key design decisions & alternatives rejected',
        'Testing & verification setup',
        'Debugging obstacles & resolutions',
        'Final result & performance metrics',
      ];
    }
    return [
      'Research citation / source activity',
      'Core hypothesis / research question',
      'Methodology & baseline configuration',
      'Empirical experiment results & tables',
      'Ablation studies & analysis',
    ];
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Study Evidence & Verification Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Completion requires proof. An empty or meaningless submission will be rejected by our AI verification gates.
          </p>
        </div>

        <button
          onClick={() => {
            setIsSubmitOpen(true);
            setEvaluationResult(null);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md transition"
        >
          <Upload className="w-4 h-4" />
          <span>Upload / Submit New Notes</span>
        </button>
      </div>

      {/* Submission Modal / Box */}
      {isSubmitOpen && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-800/80 shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">
                Submit Topic Evidence for AI Review
              </h3>
            </div>
            <button
              onClick={() => {
                setIsSubmitOpen(false);
                if (onCloseSubmit) onCloseSubmit();
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Close
            </button>
          </div>

          {selectedTask ? (
            <div className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="flex items-center space-x-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: selectedTask.track_color || '#4f46e5' }}
                >
                  {selectedTask.track_key}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {selectedTask.topic_code}
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {selectedTask.topic_title}
                </span>
              </div>

              {/* Topic-specific checklist guidance */}
              <div className="mt-3 pt-3 border-t border-slate-700/60">
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5">
                  Mandatory Evidence Criteria for {selectedTask.track_key}:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                  {getTopicGuidance(selectedTask.track_key).map((crit, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 text-xs text-amber-300 bg-amber-950/60 p-3 rounded-lg border border-amber-800">
              Please select a task from Today's Schedule or Daily Schedule to attach evidence to.
            </div>
          )}

          {evaluationResult ? (
            <div className="space-y-4">
              <div
                className={`p-5 rounded-xl border ${
                  evaluationResult.status === 'VALID'
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                    : evaluationResult.status === 'INSUFFICIENT'
                    ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                    : 'bg-rose-950/50 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {evaluationResult.status === 'VALID' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                    )}
                    <span className="text-lg font-bold">
                      Evidence Status: {evaluationResult.status}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold px-3 py-1 rounded bg-black/40">
                    Score: {evaluationResult.score}/100
                  </span>
                </div>

                <p className="text-sm mt-2 leading-relaxed">{evaluationResult.summary}</p>
                <div className="text-xs mt-2 italic opacity-90">{evaluationResult.feedback}</div>
              </div>

              {/* Checklist items */}
              {evaluationResult.checklist?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Detailed Criteria Breakdown
                  </div>
                  {evaluationResult.checklist.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start justify-between text-xs py-1 border-b border-slate-700/40 last:border-0"
                    >
                      <span className="text-slate-300">{c.item}</span>
                      <span
                        className={`font-semibold ml-2 ${
                          c.met ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {c.met ? '✓ Satisfied' : '✗ Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3">
                {evaluationResult.status === 'VALID' && selectedTask?.requires_mastery && (
                  <button
                    onClick={() => {
                      setIsSubmitOpen(false);
                      if (onOpenMasteryForTask && selectedTask) {
                        onOpenMasteryForTask(selectedTask);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>Proceed to Mastery Assessment</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setEvaluationResult(null);
                    setUserNotes('');
                    setPdfFile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Submit Additional Evidence
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Synthesized Study Notes (Text / Markdown)
                </label>
                <textarea
                  rows={6}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Summarize the core mechanism, complexity, edge cases, implementation decisions, and personal analysis in your own words..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-100 p-3 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Attach Notes PDF Document (Optional if notes text is provided)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                  />
                  {pdfFile && (
                    <span className="text-xs text-emerald-400 font-mono">
                      {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Validating with AI Reviewer...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit For AI Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search notes by topic, code, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="">All Validation Statuses</option>
          <option value="VALID">VALID (Approved)</option>
          <option value="INSUFFICIENT">INSUFFICIENT</option>
          <option value="INVALID">INVALID (Rejected)</option>
        </select>
      </div>

      {/* Library Table / List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading evidence archive...</div>
      ) : library.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h4 className="font-bold text-slate-300">No Evidence Found</h4>
          <p className="text-xs text-slate-500 mt-1">
            Submitted notes and PDFs are catalogued here for lifetime retrieval and review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {library.map((item) => {
            let analysis: any = null;
            try {
              if (item.ai_analysis_json) analysis = JSON.parse(item.ai_analysis_json);
            } catch (e) {}

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="px-2 py-0.5 rounded text-white font-bold"
                      style={{ backgroundColor: item.track_color || '#4f46e5' }}
                    >
                      {item.track_key}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.ai_status === 'VALID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : item.ai_status === 'INSUFFICIENT'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {item.ai_status}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {item.topic_code}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-0.5 truncate">
                      {item.topic_title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {item.user_notes || analysis?.summary || 'Attached PDF evidence document.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {item.original_filename && item.original_filename.endsWith('.pdf') && (
                      <a
                        href={`/api/evidence/${item.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        title="Download PDF"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteEvidence(item.id)}
                      title="Delete evidence"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
