import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../api.ts';
import {
  Settings,
  Clock,
  Calendar,
  Download,
  Trash2,
  CheckCircle2,
  Shield,
  User,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, preferences, updatePreferences, logout } = useAuth();

  const [studyStyle, setStudyStyle] = useState(preferences.study_style || 'practical');
  const [collegeEndTime, setCollegeEndTime] = useState(preferences.college_end_time || '16:00');
  const [saturdayIsWorking, setSaturdayIsWorking] = useState(
    Boolean(preferences.saturday_is_working)
  );
  const [responsePreference, setResponsePreference] = useState(
    preferences.response_preference || 'structured'
  );
  const [studyIntensity, setStudyIntensity] = useState(preferences.study_intensity || 'balanced');
  const [personalNotes, setPersonalNotes] = useState(preferences.personal_notes || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updatePreferences({
        study_style: studyStyle,
        college_end_time: collegeEndTime,
        saturday_is_working: saturdayIsWorking ? 1 : 0,
        response_preference: responsePreference,
        study_intensity: studyIntensity,
        personal_notes: personalNotes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await apiFetch('/api/user/export');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nudge_export_${user?.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'WARNING: This will permanently delete your account, isolated checkpoints, evidence files, and learning history. This action cannot be undone. Proceed?'
      )
    ) {
      return;
    }

    try {
      const res = await apiFetch('/api/user/account', {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Your account and all associated data have been permanently erased.');
        logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Personalization & System Preferences
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Every user has their own private profile, schedule windows, and study preferences. Settings are strictly isolated and never shared across accounts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Timing & College Constraints */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <Clock className="w-4 h-4" />
            <span>Academic Schedule & Timing Constraints</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                College Ending Time (Weekday Study Window Start)
              </label>
              <select
                value={collegeEndTime}
                onChange={(e) => setCollegeEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="15:00">3:00 PM (15:00)</option>
                <option value="15:30">3:30 PM (15:30)</option>
                <option value="16:00">4:00 PM (16:00) - Standard</option>
                <option value="16:30">4:30 PM (16:30)</option>
                <option value="17:00">5:00 PM (17:00)</option>
                <option value="17:30">5:30 PM (17:30)</option>
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                No study blocks will be scheduled before this time on weekdays.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Saturday Mode
              </label>
              <div className="flex items-center space-x-3 mt-2">
                <input
                  type="checkbox"
                  id="satWorking"
                  checked={saturdayIsWorking}
                  onChange={(e) => setSaturdayIsWorking(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="satWorking" className="text-xs text-slate-200">
                  Saturday is a working college day (uses weekday 4 PM - 11 PM schedule)
                </label>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                When unchecked, Saturday operates as a full non-working study day (11 AM start, 8 study hours).
              </span>
            </div>
          </div>
        </div>

        {/* Study Style & AI Interaction */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <User className="w-4 h-4" />
            <span>Learning Style & Evaluation Preferences</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Preferred Study Style
              </label>
              <select
                value={studyStyle}
                onChange={(e) => setStudyStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none"
              >
                <option value="practical">Code-First & Hands-on Implementation</option>
                <option value="theoretical">Deep Mathematical & Algorithmic Rigor</option>
                <option value="visual">Architecture & System Design Mapping</option>
                <option value="interview_focused">Interview & Defense Oriented</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                AI Feedback Preference
              </label>
              <select
                value={responsePreference}
                onChange={(e) => setResponsePreference(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none"
              >
                <option value="structured">Structured & Rubric-Driven</option>
                <option value="concise">Concise & Direct (Highlights Only)</option>
                <option value="detailed">Exhaustive & In-Depth Walkthroughs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Personal Study Notes & Goals
            </label>
            <textarea
              rows={3}
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="e.g. Preparing for Lyn distributed inference release and upcoming competitive exams..."
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preferences saved successfully!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition shadow-md"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Privacy, Data Portability & Deletion */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
          <Shield className="w-4 h-4" />
          <span>User Privacy, Data Portability & Rights</span>
        </div>
        <p className="text-xs text-slate-400">
          Your learning records, uploaded evidence files, and mastery logs belong exclusively to you. You can export or erase all personal data at any time.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Learning History (JSON)</span>
          </button>

          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Permanent Account Erasure</span>
          </button>
        </div>
      </div>
    </div>
  );
};
