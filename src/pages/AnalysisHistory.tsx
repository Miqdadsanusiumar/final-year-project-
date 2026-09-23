import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { AnalysisCase, HistoryResponse, LungClass, ReviewStatus } from '../types';
import { SyntheticBadge } from '../components/SyntheticBadge';
import { CTViewer } from '../components/CTViewer';
import { ScoreBar } from '../components/ScoreBar';

interface AnalysisHistoryProps {
  initialSelectedId?: string;
  onClearInitialId?: () => void;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  initialSelectedId,
  onClearInitialId
}) => {
  const [cases, setCases] = useState<AnalysisCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterReview, setFilterReview] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Selected case for detailed drawer
  const [selectedCase, setSelectedCase] = useState<AnalysisCase | null>(null);
  const [updatingReview, setUpdatingReview] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editStatus, setEditStatus] = useState<ReviewStatus>('unreviewed');
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '8',
        predicted_class: filterClass,
        review_status: filterReview,
        search
      });

      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to retrieve history records from backend.');

      const data: HistoryResponse = await res.json();
      setCases(data.cases);
      setTotalPages(data.pagination.total_pages);
      setTotalItems(data.pagination.total_items);

      if (initialSelectedId) {
        const found = data.cases.find(c => c.id === initialSelectedId);
        if (found) {
          openCaseDetails(found);
        } else {
          // Fetch directly
          fetchCaseById(initialSelectedId);
        }
        if (onClearInitialId) onClearInitialId();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching history data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseById = async (id: string) => {
    try {
      const res = await fetch(`/api/cases/${id}`);
      if (res.ok) {
        const c: AnalysisCase = await res.json();
        openCaseDetails(c);
      }
    } catch (e) {
      console.warn("Could not load case by id:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, filterClass, filterReview]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const openCaseDetails = (c: AnalysisCase) => {
    setSelectedCase(c);
    setEditNotes(c.review_notes || '');
    setEditStatus(c.review_status);
    setUpdateSuccess(false);
  };

  const handleSaveCaseReview = async () => {
    if (!selectedCase) return;
    setUpdatingReview(true);
    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_status: editStatus,
          review_notes: editNotes
        })
      });

      if (!res.ok) throw new Error('Failed saving review');

      const data = await res.json();
      setSelectedCase(data.case);
      setUpdateSuccess(true);
      fetchHistory(); // Refresh table
      setTimeout(() => setUpdateSuccess(false), 2500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed saving review.");
    } finally {
      setUpdatingReview(false);
    }
  };

  const handleExportCSV = () => {
    // Direct browser trigger to backend export endpoint
    window.location.href = '/api/export';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Persistent Research Invariant Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102E36]">
            Analysis Surveillance Log & History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Auditable archive of CT slice predictions with guaranteed synthetic labeling and human verification tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-[#126B67]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Scan ID, filename, or clinical notes..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#126B67] focus:border-[#126B67]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Filter by class */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Class:</span>
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:ring-[#126B67]"
              >
                <option value="all">All Classes</option>
                <option value="benign">Benign</option>
                <option value="malignant">Malignant</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            {/* Filter by review */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Review:</span>
              <select
                value={filterReview}
                onChange={(e) => {
                  setFilterReview(e.target.value);
                  setPage(1);
                }}
                className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:ring-[#126B67]"
              >
                <option value="all">All Statuses</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="reviewed">Reviewed</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#126B67] hover:bg-[#0D524F] rounded-md transition-colors whitespace-nowrap"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#126B67]" />
            <span>Loading analysis registry...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700 text-sm">
            <span>{error}</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No matching CT analysis records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Scan Case ID</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Predicted Class</th>
                  <th className="px-6 py-3.5">Scores (B / M / N)</th>
                  <th className="px-6 py-3.5">Inference Mode</th>
                  <th className="px-6 py-3.5">Review Status</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCaseDetails(c)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {c.id}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                      {new Date(c.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-semibold ${
                          c.predicted_class === 'Benign'
                            ? 'text-teal-700'
                            : c.predicted_class === 'Malignant'
                            ? 'text-rose-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {c.predicted_class}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600 tabular-nums">
                      {(c.scores.benign * 100).toFixed(0)}% / {(c.scores.malignant * 100).toFixed(0)}% / {(c.scores.normal * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4">
                      <SyntheticBadge isSynthetic={c.is_synthetic} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          c.review_status === 'reviewed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : c.review_status === 'flagged'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {c.review_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCaseDetails(c);
                        }}
                        className="text-xs font-semibold text-[#126B67] hover:underline"
                      >
                        View Case
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {cases.length} of {totalItems} total scan records
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700 tabular-nums">
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Case Detail Modal / Panel */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-[#102E36] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-teal-300">
                  {selectedCase.id}
                </span>
                <SyntheticBadge isSynthetic={selectedCase.is_synthetic} size="sm" />
              </div>

              <button
                onClick={() => setSelectedCase(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: CT Image View */}
                <div>
                  <CTViewer
                    imageUrl={selectedCase.image_preview_url}
                    filename={selectedCase.filename}
                  />
                  <div className="mt-2 flex justify-between text-[11px] font-mono text-slate-500">
                    <span>Size: {(selectedCase.file_size_bytes / 1024).toFixed(1)} KB</span>
                    <span>Latency: {selectedCase.processing_time_ms}ms</span>
                    <span>Date: {new Date(selectedCase.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right: Scores & Audit Form */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Class Softmax Result:</span>
                    <span
                      className={`text-2xl font-bold tracking-tight ${
                        selectedCase.predicted_class === 'Benign'
                          ? 'text-teal-700'
                          : selectedCase.predicted_class === 'Malignant'
                          ? 'text-rose-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {selectedCase.predicted_class}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <ScoreBar
                      label="Benign"
                      score={selectedCase.scores.benign}
                      isSynthetic={selectedCase.is_synthetic}
                      isPrimary={selectedCase.predicted_class === 'Benign'}
                    />
                    <ScoreBar
                      label="Malignant"
                      score={selectedCase.scores.malignant}
                      isSynthetic={selectedCase.is_synthetic}
                      isPrimary={selectedCase.predicted_class === 'Malignant'}
                    />
                    <ScoreBar
                      label="Normal"
                      score={selectedCase.scores.normal}
                      isSynthetic={selectedCase.is_synthetic}
                      isPrimary={selectedCase.predicted_class === 'Normal'}
                    />
                  </div>

                  {/* Research Disclaimer */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-snug">
                    <strong className="block mb-0.5">Research Classification Disclaimer:</strong>
                    This prediction is strictly experimental and uncalibrated. Never use for patient diagnosis.
                  </div>

                  {/* Human Review Form */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Human Review Protocol
                      </label>
                      {updateSuccess && (
                        <span className="text-xs text-emerald-700 font-medium">Saved</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditStatus('reviewed')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border ${
                          editStatus === 'reviewed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('flagged')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border ${
                          editStatus === 'flagged'
                            ? 'bg-rose-50 text-rose-800 border-rose-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Flagged
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('unreviewed')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border ${
                          editStatus === 'unreviewed'
                            ? 'bg-slate-100 text-slate-800 border-slate-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Unreviewed
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Enter reviewer notes or radiologic impressions..."
                      className="w-full text-xs p-2 rounded-md border border-slate-200 focus:ring-1 focus:ring-[#126B67]"
                    />

                    <button
                      type="button"
                      disabled={updatingReview}
                      onClick={handleSaveCaseReview}
                      className="w-full py-2 text-xs font-semibold text-white bg-[#126B67] hover:bg-[#0D524F] rounded-lg transition-colors shadow-xs"
                    >
                      {updatingReview ? 'Updating Review...' : 'Save Review Entry'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
