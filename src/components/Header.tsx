import React from 'react';
import { Activity, UploadCloud, ShieldAlert, BarChart3, Clock, Layers } from 'lucide-react';

interface HeaderProps {
  currentTab: 'dashboard' | 'analyze' | 'history' | 'model';
  onTabChange: (tab: 'dashboard' | 'analyze' | 'history' | 'model') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Banner: Mandatory Unremovable Research Use Invariant */}
      <div className="bg-[#102E36] text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium tracking-wide">
            RESEARCH USE ONLY — NOT FOR CLINICAL DIAGNOSIS OR INDEPENDENT CANCER RISK EVALUATION.
          </span>
        </div>
      </div>

      {/* Main Top Bar Contract: 3 Zones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-[#126B67] flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#102E36]">LungNet</span>
              <span className="hidden sm:inline text-xs font-mono ml-2 text-slate-500 uppercase tracking-wider">
                Research v0.3
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'text-[#126B67] bg-[#126B67]/10 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'history'
                ? 'text-[#126B67] bg-[#126B67]/10 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Analysis History
          </button>
          <button
            onClick={() => onTabChange('model')}
            className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              currentTab === 'model'
                ? 'text-[#126B67] bg-[#126B67]/10 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Model Review & Audit
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('analyze')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#126B67] rounded-lg hover:bg-[#0D524F] transition-colors shadow-sm whitespace-nowrap focus:ring-2 focus:ring-[#126B67] focus:ring-offset-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Scan</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-slate-50 px-2 py-2">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'dashboard' ? 'text-[#126B67]' : 'text-slate-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => onTabChange('analyze')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'analyze' ? 'text-[#126B67]' : 'text-slate-600'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Analyze</span>
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'history' ? 'text-[#126B67]' : 'text-slate-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>History</span>
        </button>
        <button
          onClick={() => onTabChange('model')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'model' ? 'text-[#126B67]' : 'text-slate-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Model Review</span>
        </button>
      </div>
    </header>
  );
};
