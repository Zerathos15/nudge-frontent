import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Calendar,
  Layers,
  FileCheck2,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  BookOpen,
  FlaskConical,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { user, activeCurriculum, activeSchedule, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Calendar },
    { id: 'schedule', label: 'Daily Schedule', icon: Layers },
    { id: 'checkpoints', label: 'Checkpoints', icon: BookOpen },
    { id: 'evidence', label: 'Evidence Library', icon: FileCheck2 },
    { id: 'research', label: 'Research & Projects', icon: FlaskConical },
    { id: 'settings', label: 'Personalization', icon: Settings },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ id: 'admin', label: 'Curriculum Admin', icon: ShieldAlert });
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Version Indicators */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                  NUDGE
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                  Keep Moving forward
                </span>
              </div>
            </div>

            {/* Active Curriculum & Schedule Badges */}
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <div className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60 flex items-center space-x-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-400">Curriculum:</span>
                <span className="font-semibold text-emerald-300">
                  {activeCurriculum ? activeCurriculum.version_number : 'Not Loaded'}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/60 flex items-center space-x-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span className="text-slate-400">Schedule:</span>
                <span className="font-semibold text-sky-300">
                  {activeSchedule ? activeSchedule.version_number : 'Not Loaded'}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-200">{user?.full_name}</div>
              <div className="text-xs text-slate-400 flex items-center justify-end space-x-1.5">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider ${
                    user?.role === 'ADMIN'
                      ? 'bg-purple-900/80 text-purple-200 border border-purple-700'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {user?.role}
                </span>
                <span>{user?.email}</span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Log out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex overflow-x-auto py-2 space-x-1 sm:space-x-2 border-t border-slate-800/80 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
