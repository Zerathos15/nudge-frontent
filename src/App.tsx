import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { AuthView } from './components/AuthView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ScheduleView } from './components/ScheduleView.tsx';
import { CheckpointsView } from './components/CheckpointsView.tsx';
import { EvidenceView } from './components/EvidenceView.tsx';
import { ResearchView } from './components/ResearchView.tsx';
import { AdminCurriculumView } from './components/AdminCurriculumView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { MasteryModal } from './components/MasteryModal.tsx';
import { ResetPasswordView } from './components/ResetPasswordView.tsx';
import { ScheduledTask } from './types.ts';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [evidenceTask, setEvidenceTask] = useState<ScheduledTask | null>(null);
  const [masteryTask, setMasteryTask] = useState<ScheduledTask | null>(null);

  // Check URL parameters for resetToken or token
  const getInitialResetToken = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('resetToken') || urlParams.get('token') || '';
    } catch {
      return '';
    }
  };

  const [resetToken, setResetToken] = useState<string>(getInitialResetToken());
  const [isResetPasswordView, setIsResetPasswordView] = useState<boolean>(!!getInitialResetToken());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Initializing NUDGE...</span>
        </div>
      </div>
    );
  }

  // Dedicated Password Reset Screen
  if (isResetPasswordView) {
    return (
      <ResetPasswordView
        initialToken={resetToken}
        onNavigateToLogin={() => {
          setIsResetPasswordView(false);
          setResetToken('');
          // Clean up query param from URL without page reload
          if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
          }
        }}
      />
    );
  }

  if (!user) {
    return (
      <AuthView
        onOpenResetPassword={(token) => {
          setResetToken(token || '');
          setIsResetPasswordView(true);
        }}
      />
    );
  }

  const handleOpenEvidence = (task: ScheduledTask) => {
    setEvidenceTask(task);
    setActiveTab('evidence');
  };

  const handleOpenMastery = (task: ScheduledTask) => {
    setMasteryTask(task);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenEvidence={handleOpenEvidence}
            onOpenMastery={handleOpenMastery}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            onOpenEvidence={handleOpenEvidence}
            onOpenMastery={handleOpenMastery}
          />
        )}

        {activeTab === 'checkpoints' && <CheckpointsView />}

        {activeTab === 'evidence' && (
          <EvidenceView
            initialTask={evidenceTask}
            onCloseSubmit={() => setEvidenceTask(null)}
            onOpenMasteryForTask={handleOpenMastery}
          />
        )}

        {activeTab === 'research' && <ResearchView />}

        {activeTab === 'admin' && user.role === 'ADMIN' && <AdminCurriculumView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Mastery Assessment Modal */}
      {masteryTask && (
        <MasteryModal
          task={masteryTask}
          onClose={() => setMasteryTask(null)}
          onSuccess={() => {
            // refresh
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
