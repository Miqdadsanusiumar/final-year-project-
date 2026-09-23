import React, { useState, useEffect } from 'react';
import { UploadCloud, Clock, ShieldAlert, CheckCircle2, ChevronRight, RefreshCw, BarChart2, FileSpreadsheet } from 'lucide-react';
import { DashboardStats, AnalysisCase, ModelInfo } from '../types';
import { SyntheticBadge } from '../components/SyntheticBadge';
import { AIChatbot } from '../components/AIChatbot';

interface DashboardProps {
  onNavigate: (tab: 'dashboard' | 'analyze' | 'history' | 'model', scanId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<AnalysisCase[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, historyRes, modelRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/history?page=1&limit=5'),
        fetch('/api/model-info')
      ]);

      if (!statsRes.ok || !historyRes.ok || !modelRes.ok) {
        throw new Error('Failed to load dashboard metrics from backend.');
      }

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();
      const modelData = await modelRes.json();

      setStats(statsData);
      setRecentCases(historyData.cases || []);
      setModelInfo(modelData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with LungNet backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102E36]">
            Research Surveillance Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end convolutional neural network evaluation for pulmonary CT slice classification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => onNavigate('analyze')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#126B67] rounded-lg hover:bg-[#0D524F] transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Analyze New Scan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="font-semibold underline ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Scans */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Scans Processed
            </span>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono-numbers m-0 p-0">
              {stats?.total_cases ?? 0}
            </span>
            <span className="text-xs text-slate-500">records</span>
          </div>
          <p className="mt-0 m-0 p-0 text-xs text-slate-500">
            {stats?.synthetic_count ?? 0} marked [SYNTHETIC]
          </p>
        </div>

        {/* Card 2: Validated Accuracy (Non-negotiable: persistently Pending) */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Validated Accuracy
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900 font-mono">
              Pending
            </span>
            <span className="text-xs font-mono text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
              Awaiting Trial
            </span>
          </div>
          <p className="mt-0 m-0 p-0 text-[11px] text-amber-800 leading-snug">
            Pending independent patient-disjoint trial. No fabricated accuracy claims.
          </p>
        </div>

        {/* Card 3: Class Stratification */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Class Breakdown
            </span>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-mono">
            <div className="text-center">
              <span className="block text-slate-500 text-[10px]">BENIGN</span>
              <span className="font-bold text-teal-700 text-lg tabular-nums">
                {stats?.benign_count ?? 0}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center">
              <span className="block text-slate-500 text-[10px]">MALIGNANT</span>
              <span className="font-bold text-rose-700 text-lg tabular-nums">
                {stats?.malignant_count ?? 0}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center">
              <span className="block text-slate-500 text-[10px]">NORMAL</span>
              <span className="font-bold text-blue-700 text-lg tabular-nums">
                {stats?.normal_count ?? 0}
              </span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Current session predictions
          </p>
        </div>

        {/* Card 4: Human Review Audit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Human Review Status
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#126B67]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono-numbers">
              {stats?.reviewed_count ?? 0}
            </span>
            <span className="text-xs text-slate-500">
              / {stats?.total_cases ?? 0} reviewed
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Human-in-the-loop audit protocol active
          </p>
        </div>
      </div>

      {/* Quick Upload Launchpad */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#102E36]">
              CT Scan Slice Inference Engine
            </h2>
            <span className="text-xs font-mono text-slate-500">
              Resolution: 224×224 RGB
            </span>
          </div>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Upload standard axial pulmonary computed tomography slices in PNG or JPEG format up to 10MB.
            The system standardizes voxel intensity to ImageNet channels, performs multi-class projection,
            and generates comparative softmax scores across Benign, Malignant, and Normal classes.
          </p>

          <div
            onClick={() => onNavigate('analyze')}
            className="border-2 border-dashed border-slate-300 hover:border-[#126B67] bg-slate-50/70 hover:bg-[#126B67]/5 rounded-xl p-8 text-center cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-[#126B67] group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-[#126B67]">
              Drop lung CT scan here, or click to open analysis suite
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Supports PNG and JPEG up to 10MB. Built-in research phantom demonstration cases available.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Research use only — not for diagnosis
          </span>
          <span>Zero patient data stored</span>
        </div>
      </div>

      {/* AI Research Chatbot Section (Replacing removed table) */}
      <div>
        <AIChatbot embedded={true} />
      </div>
    </div>
  );
};
