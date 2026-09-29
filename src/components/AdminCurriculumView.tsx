import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../api.ts';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Calendar,
  Clock,
  Download,
  History,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export const AdminCurriculumView: React.FC = () => {
  const { refreshUser } = useAuth();
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [topicFile, setTopicFile] = useState<File | null>(null);
  const [uploadingSchedule, setUploadingSchedule] = useState(false);
  const [uploadingTopic, setUploadingTopic] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [activating, setActivating] = useState(false);

  // Staged Preview data
  const [stagedData, setStagedData] = useState<{
    stagedCurriculum: any;
    stagedSchedule: any;
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
  } | null>(null);

  // Version history & audit logs
  const [curriculumVersions, setCurriculumVersions] = useState<any[]>([]);
  const [scheduleVersions, setScheduleVersions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ingestion' | 'history' | 'audit'>('ingestion');

  const fetchStagedPreview = async () => {
    try {
      const res = await apiFetch('/api/admin/staged-preview');
      if (res.ok) {
        const data = await res.json();
        setStagedData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistoryAndLogs = async () => {
    try {
      const [resVer, resAudit] = await Promise.all([
        apiFetch('/api/admin/versions'),
        apiFetch('/api/admin/audit-logs'),
      ]);

      if (resVer.ok) {
        const v = await resVer.json();
        setCurriculumVersions(v.curriculumVersions || []);
        setScheduleVersions(v.scheduleVersions || []);
      }

      if (resAudit.ok) {
        const a = await resAudit.json();
        setAuditLogs(a.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStagedPreview();
    fetchHistoryAndLogs();
  }, []);

  const handleUploadSchedule = async () => {
    if (!scheduleFile) return;
    try {
      setUploadingSchedule(true);
      const formData = new FormData();
      formData.append('file', scheduleFile);

      const res = await apiFetch('/api/admin/upload-schedule-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload Schedule PDF');

      alert('Schedule Reference PDF uploaded & parsed successfully!');
      fetchStagedPreview();
      setScheduleFile(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingSchedule(false);
    }
  };

  const handleUploadTopic = async () => {
    if (!topicFile) return;
    try {
      setUploadingTopic(true);
      const formData = new FormData();
      formData.append('file', topicFile);

      const res = await apiFetch('/api/admin/upload-topic-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload Topic PDF');

      alert('Topic/Task Reference PDF uploaded & parsed successfully!');
      fetchStagedPreview();
      setTopicFile(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingTopic(false);
    }
  };

  const handleLoadSamplePdfs = async () => {
    try {
      setLoadingSample(true);
      const res = await apiFetch('/api/admin/load-sample-pdfs', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sample PDFs');

      alert('Standard Reference PDFs ingested and staged! Review the preview below and click Activate.');
      fetchStagedPreview();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleActivate = async () => {
    try {
      setActivating(true);
      const res = await apiFetch('/api/admin/activate-version', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate version');

      alert('Version successfully committed and activated! Daily schedules will now derive from this curriculum.');
      fetchStagedPreview();
      fetchHistoryAndLogs();
      refreshUser();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Curriculum Administration & PDF Ingestion
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload authoritative Schedule & Topic/Task PDFs. The scheduling engine strictly derives all rules, topics, prerequisites, and timings from these documents.
          </p>
        </div>

        {/* Action tabs */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ingestion' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            PDF Ingestion & Preview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Version History
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Audit Log
          </button>
        </div>
      </div>

      {activeTab === 'ingestion' && (
        <div className="space-y-8">
          {/* Quick Setup & Sample Tools */}
          <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-indigo-200 text-sm flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>One-Click Test Pipeline / Sample Download</span>
              </h4>
              <p className="text-xs text-indigo-300/80 mt-1">
                You can download the reference PDFs or immediately ingest sample specifications to test structural parsing and schedule generation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/admin/download-sample-pdf/schedule"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Schedule PDF</span>
              </a>
              <a
                href="/api/admin/download-sample-pdf/curriculum"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Topic PDF</span>
              </a>
              <button
                onClick={handleLoadSamplePdfs}
                disabled={loadingSample}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md"
              >
                {loadingSample ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Load Standard Reference PDFs</span>
              </button>
            </div>
          </div>

          {/* Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF 1: Schedule Reference */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    PDF 1: Schedule Reference Blueprint
                  </h3>
                  <p className="text-xs text-slate-400">
                    Weekday windows, Saturday working/non-working, Sunday rules, max 1h blocks.
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setScheduleFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                />
              </div>

              <button
                onClick={handleUploadSchedule}
                disabled={!scheduleFile || uploadingSchedule}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition"
              >
                {uploadingSchedule ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting & Parsing Structure...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Parse Schedule PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* PDF 2: Topic / Task Reference */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    PDF 2: Topic / Task Reference Blueprint
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tracks (DSA, AIML, Lyn, Research), modules, topic codes, prerequisites.
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setTopicFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                />
              </div>

              <button
                onClick={handleUploadTopic}
                disabled={!topicFile || uploadingTopic}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition"
              >
                {uploadingTopic ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting & Parsing Structure...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Parse Topic PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Validation & Staged Preview Section */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Staged PDF Structure Validation & Confirmation</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect detected tracks, modules, topics, rules, and prerequisites before making this version authoritative.
                </p>
              </div>

              <button
                onClick={handleActivate}
                disabled={
                  activating ||
                  (!stagedData?.stagedCurriculum && !stagedData?.stagedSchedule) ||
                  stagedData?.validation?.isValid === false
                }
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition"
              >
                {activating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activating Version...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Activate Active Version</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation messages */}
            {stagedData?.validation?.errors && stagedData.validation.errors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 space-y-1.5">
                <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Parsing Validation Errors</span>
                </div>
                {stagedData.validation.errors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-200">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {stagedData?.validation?.warnings && stagedData.validation.warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800 space-y-1.5">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Prerequisite Warnings</span>
                </div>
                {stagedData.validation.warnings.map((warn, i) => (
                  <p key={i} className="text-xs text-amber-200">
                    • {warn}
                  </p>
                ))}
              </div>
            )}

            {/* Preview Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detected Schedule Rules */}
              <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Schedule Blueprint Rules
                  </span>
                  {stagedData?.stagedSchedule && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {stagedData.stagedSchedule.filename}
                    </span>
                  )}
                </div>

                {stagedData?.stagedSchedule ? (
                  <div className="space-y-2.5">
                    {stagedData.stagedSchedule.rules?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-bold text-slate-200">{r.day_type}</div>
                        <div className="text-slate-400 mt-1 flex flex-wrap gap-2">
                          <span>Window: {r.window_start} – {r.window_end}</span>
                          <span>•</span>
                          <span>Max Block: {r.max_continuous_minutes}m</span>
                          <span>•</span>
                          <span>Break: {r.break_minutes}m</span>
                          <span>•</span>
                          <span>Daily: {r.max_daily_hours} hrs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-4">
                    No Schedule PDF staged yet.
                  </div>
                )}
              </div>

              {/* Detected Curriculum Structure */}
              <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Curriculum Structure & Dependency Graph
                  </span>
                  {stagedData?.stagedCurriculum && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {stagedData.stagedCurriculum.filename}
                    </span>
                  )}
                </div>

                {stagedData?.stagedCurriculum ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Tracks</div>
                        <div className="font-bold text-white text-base">
                          {stagedData.stagedCurriculum.tracksCount}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Modules</div>
                        <div className="font-bold text-white text-base">
                          {stagedData.stagedCurriculum.modulesCount}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Topics</div>
                        <div className="font-bold text-white text-base">
                          {stagedData.stagedCurriculum.topicsCount}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {stagedData.stagedCurriculum.tracks?.map((t: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <div className="font-bold text-indigo-300">
                            [{t.track_key}] {t.title}
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            {t.modules?.length || 0} modules detected
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-4">
                    No Topic Reference PDF staged yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-400" />
              <span>Curriculum Version Archive</span>
            </h3>
            <p className="text-xs text-slate-400">
              Historical completion records and mastery logs remain bound to the version under which they were completed. Activating a new version adjusts future generation without rewriting historical progress.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Version</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Source PDF</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Activated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {curriculumVersions.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-indigo-400">{v.version_number}</td>
                      <td className="p-3 font-medium text-white">{v.title}</td>
                      <td className="p-3 font-mono text-slate-400">{v.source_filename}</td>
                      <td className="p-3">
                        {v.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px]">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium text-[10px]">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 font-mono">
                        {new Date(v.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Cryptographic Security & System Audit Logs</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor Email</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-300">{log.action}</td>
                    <td className="p-3 text-slate-300">{log.user_email || 'System'}</td>
                    <td className="p-3 font-mono text-slate-400 truncate max-w-xs">
                      {log.details_json}
                    </td>
                    <td className="p-3 font-mono text-slate-500">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
