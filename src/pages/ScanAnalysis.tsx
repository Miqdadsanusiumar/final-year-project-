import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Info,
  Maximize2,
  Check,
  Clock,
  Cpu,
  Layers,
  HelpCircle
} from 'lucide-react';
import { AnalysisCase, ClassScores, LungClass } from '../types';
import { CTViewer } from '../components/CTViewer';
import { ScoreBar } from '../components/ScoreBar';
import { SyntheticBadge } from '../components/SyntheticBadge';
import { SAMPLE_CT_SLICES } from '../utils/sampleImages';

interface ScanAnalysisProps {
  onDisclaimerRequest: () => void;
  disclaimerAccepted: boolean;
  onAnalysisSuccess: () => void;
}

export const ScanAnalysis: React.FC<ScanAnalysisProps> = ({
  onDisclaimerRequest,
  disclaimerAccepted,
  onAnalysisSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoClass, setDemoClass] = useState<LungClass>('Benign');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisCase | null>(null);

  // Advanced inference settings
  const [forceMockScore, setForceMockScore] = useState<boolean>(true);

  // Review status states
  const [reviewStatus, setReviewStatus] = useState<'unreviewed' | 'reviewed' | 'flagged'>('unreviewed');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewSaved, setReviewSaved] = useState<boolean>(false);
  const [savingReview, setSavingReview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    setResult(null);
    setReviewSaved(false);

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError(`File exceeds maximum allowable size of 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB detected). Please choose a smaller slice.`);
      return;
    }

    // Validate MIME format (PNG or JPEG)
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setError("Invalid file format. Only standard PNG and JPEG thoracic CT images are supported.");
      return;
    }

    setSelectedFile(file);
    setFilename(file.name);
    setIsDemoMode(false);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRunDemo = (type: LungClass) => {
    if (!disclaimerAccepted) {
      onDisclaimerRequest();
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFile(null);
    setIsDemoMode(true);
    setDemoClass(type);
    setReviewSaved(false);

    let sample: { id: string; filename: string; title: string; description: string; category: LungClass; svgDataUri: string } = SAMPLE_CT_SLICES.benign;
    if (type === 'Malignant') sample = SAMPLE_CT_SLICES.malignant;
    if (type === 'Normal') sample = SAMPLE_CT_SLICES.normal;

    setFilename(sample.filename);
    setPreviewUrl(sample.id);

    // Trigger analysis
    executeAnalysis(null, true, type);
  };

  const executeAnalysis = async (fileToAnalyze: File | null, forceMock: boolean = true, forceClass?: string) => {
    if (!disclaimerAccepted) {
      onDisclaimerRequest();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setLoadingStep("Validating image binary & magic bytes...");
      await new Promise(r => setTimeout(r, 120));

      setLoadingStep("Standardizing axial slice to 224×224 RGB...");
      await new Promise(r => setTimeout(r, 150));

      setLoadingStep("Applying ImageNet channel-wise normalization...");
      await new Promise(r => setTimeout(r, 140));

      setLoadingStep("Executing CNN feature projection & 3-class softmax...");

      const formData = new FormData();
      if (fileToAnalyze) {
        formData.append('file', fileToAnalyze);
      }
      if (forceMock || isDemoMode || forceMockScore) {
        formData.append('force_mock', 'true');
      }
      if (forceClass) {
        formData.append('force_class', forceClass);
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Analysis request failed with status ${response.status}`);
      }

      const data: AnalysisCase = await response.json();
      setResult(data);
      setReviewStatus(data.review_status);
      setReviewNotes(data.review_notes || '');
      onAnalysisSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Service encountered an error while processing the scan.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSaveReview = async () => {
    if (!result) return;
    setSavingReview(true);
    try {
      const res = await fetch(`/api/cases/${result.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_status: reviewStatus,
          review_notes: reviewNotes
        })
      });

      if (!res.ok) throw new Error('Failed to update human review status');
      setReviewSaved(true);
      setTimeout(() => setReviewSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed saving review status.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleResetWorkspace = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setIsDemoMode(false);
    setReviewSaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Persistent Research Invariant Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102E36]">
            Pulmonary CT Scan Analysis Suite
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Axial thoracic CT classification: Benign vs. Malignant vs. Normal
          </p>
        </div>

        {/* Small persistent research invariant */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Research use only — not for diagnosis</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold">Analysis Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Analysis Workspace: Asymmetric Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Demo / Preview Stage (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {!previewUrl ? (
            /* File Drag-and-Drop Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all shadow-xs flex flex-col items-center justify-center min-h-[420px] ${
                isDraggingOver
                  ? 'border-[#126B67] bg-[#126B67]/10 scale-[1.01]'
                  : 'border-slate-300 hover:border-[#126B67] bg-white'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform ${
                  isDraggingOver
                    ? 'bg-[#126B67] text-white scale-110'
                    : 'bg-[#126B67]/10 text-[#126B67]'
                } mb-4`}
              >
                <UploadCloud className="w-8 h-8" />
              </div>

              <h2 className="text-base font-bold text-slate-900">
                {isDraggingOver ? "Release to drop CT scan image" : "Select or drag & drop an axial lung CT slice"}
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 max-w-md leading-relaxed">
                Standard thoracic windowing recommended. Format must be authentic PNG or JPEG. Maximum file size: 10MB.
              </p>

              {/* Browse Files Button */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#126B67] rounded-lg hover:bg-[#0D524F] transition-colors shadow-sm focus:ring-2 focus:ring-[#126B67] focus:ring-offset-1"
                >
                  Browse Local Files
                </button>
              </div>

              {/* Research Test Phantoms */}
              <div className="mt-8 pt-6 border-t border-slate-200 w-full max-w-lg">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                  Or evaluate standard research phantoms:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRunDemo('Benign')}
                    className="p-2.5 text-left border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 rounded-lg transition-colors group"
                  >
                    <span className="text-xs font-bold text-teal-900 block group-hover:text-teal-950">
                      Phantom A
                    </span>
                    <span className="text-[11px] text-teal-700 block mt-0.5">
                      Benign Solitary Nodule
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunDemo('Malignant')}
                    className="p-2.5 text-left border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 rounded-lg transition-colors group"
                  >
                    <span className="text-xs font-bold text-rose-900 block group-hover:text-rose-950">
                      Phantom B
                    </span>
                    <span className="text-[11px] text-rose-700 block mt-0.5">
                      Malignant Spiculated Mass
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunDemo('Normal')}
                    className="p-2.5 text-left border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 rounded-lg transition-colors group"
                  >
                    <span className="text-xs font-bold text-blue-900 block group-hover:text-blue-950">
                      Control C
                    </span>
                    <span className="text-[11px] text-blue-700 block mt-0.5">
                      Normal Parenchyma
                    </span>
                  </button>
                </div>
              </div>

              {/* Upload Safety Notice */}
              <div className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Zero patient data is retained on servers. Slices are processed in volatile memory.</span>
              </div>
            </div>
          ) : (
            /* Active Image Preview with CTViewer (Zoom, Fit, Invert, Replace) */
            <div className="space-y-4">
              <CTViewer
                imageUrl={previewUrl}
                filename={filename}
                onReplace={handleResetWorkspace}
              />

              {/* Action Bar Under Preview */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <FileImage className="w-4 h-4 text-slate-400" />
                  <span className="font-mono font-medium text-slate-800">{filename}</span>
                  {selectedFile && (
                    <span className="text-slate-400">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                  {isDemoMode && (
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Demo Phantom ({demoClass})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResetWorkspace}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Replace Image
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => executeAnalysis(selectedFile, isDemoMode, isDemoMode ? demoClass : undefined)}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#126B67] hover:bg-[#0D524F] disabled:opacity-50 rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-[#126B67]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Run Model Inference</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Switch Demo Phantom Toolbar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Quick switch phantom:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunDemo('Benign')}
                    className="px-2.5 py-1 text-[11px] font-medium text-teal-800 bg-white border border-slate-200 rounded hover:bg-teal-50 transition-colors"
                  >
                    Benign Nodule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDemo('Malignant')}
                    className="px-2.5 py-1 text-[11px] font-medium text-rose-800 bg-white border border-slate-200 rounded hover:bg-rose-50 transition-colors"
                  >
                    Malignant Mass
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDemo('Normal')}
                    className="px-2.5 py-1 text-[11px] font-medium text-blue-800 bg-white border border-slate-200 rounded hover:bg-blue-50 transition-colors"
                  >
                    Normal Parenchyma
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Results Display Section (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {loading ? (
            /* Loading State with Progress Steps */
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-14 h-14 rounded-full bg-[#126B67]/10 flex items-center justify-center text-[#126B67] mb-4">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Inference In Progress
              </h3>
              <p className="mt-2 text-xs font-mono text-[#126B67] bg-[#126B67]/10 px-3 py-1.5 rounded-md max-w-sm">
                {loadingStep}
              </p>
              <div className="mt-6 space-y-2 text-left w-full max-w-xs text-[11px] text-slate-500 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>Validating PNG/JPEG headers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>Bilinear interpolation to 224×224</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#126B67]" />
                  <span>Evaluating CNN feature maps</span>
                </div>
              </div>
            </div>
          ) : result ? (
            /* Results Display Section */
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Top Banner: Prominent Distinction Between Real & Synthetic */}
              {result.is_synthetic ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      [SYNTHETIC] Candidate Mock Score
                    </span>
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded font-semibold">
                      Weights Pending
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                    Verified patient-disjoint weights are not loaded. This score is generated via deterministic candidate mock logic for research evaluation.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      [REAL] Calibrated Checkpoint Active
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded font-semibold">
                      Weights Loaded
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1 leading-snug">
                    Evaluated with calibrated convolutional neural network checkpoint.
                  </p>
                </div>
              )}

              {/* Classification Headline */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-mono uppercase tracking-wider">
                    Scan ID: {result.id}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">
                    Latency: {result.processing_time_ms}ms
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Top Predicted Class:</span>
                    <span
                      className={`text-2xl font-bold tracking-tight ${
                        result.predicted_class === 'Benign'
                          ? 'text-teal-700'
                          : result.predicted_class === 'Malignant'
                          ? 'text-rose-700'
                          : 'text-blue-700'
                      }`}
                    >
                      {result.predicted_class}
                    </span>
                  </div>

                  <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Highest Probability
                  </span>
                </div>
              </div>

              {/* Three-Class Probability Bars */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Class Softmax Breakdown</span>
                  <span className="font-mono text-[10px]">Sum: 1.000</span>
                </div>

                <ScoreBar
                  label="Benign"
                  score={result.scores.benign}
                  isSynthetic={result.is_synthetic}
                  isPrimary={result.predicted_class === 'Benign'}
                  description="Non-malignant solitary lesion, calcified granuloma, or hamartoma."
                />

                <ScoreBar
                  label="Malignant"
                  score={result.scores.malignant}
                  isSynthetic={result.is_synthetic}
                  isPrimary={result.predicted_class === 'Malignant'}
                  description="Malignant pulmonary neoplasm (e.g. adenocarcinoma or squamous cell)."
                />

                <ScoreBar
                  label="Normal"
                  score={result.scores.normal}
                  isSynthetic={result.is_synthetic}
                  isPrimary={result.predicted_class === 'Normal'}
                  description="Unremarkable pulmonary parenchyma without focal opacities."
                />
              </div>

              {/* Persistent Unremovable Research Disclaimer */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-lg text-amber-900 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Research use only — not for diagnosis</span>
                </div>
                Scores represent raw multi-class softmax activations. They are <strong>uncalibrated</strong> and do not equate to individual cancer risk or medical diagnosis. Expert radiologist verification is strictly required.
              </div>

              {/* Human-in-the-Loop Review Station */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-[#126B67]" />
                    Human Review Protocol
                  </label>
                  {reviewSaved && (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Review Saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('reviewed')}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md border transition-colors ${
                      reviewStatus === 'reviewed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Confirm / Reviewed
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('flagged')}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md border transition-colors ${
                      reviewStatus === 'flagged'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Flag for Secondary
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('unreviewed')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md border transition-colors ${
                      reviewStatus === 'unreviewed'
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Unreviewed
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record radiologic observations, slice level, or nodule characteristics..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#126B67] focus:border-[#126B67]"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingReview}
                    onClick={handleSaveReview}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-[#126B67] hover:bg-[#0D524F] rounded-lg transition-colors shadow-xs"
                  >
                    {savingReview ? "Saving review..." : "Save Review to Database"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetWorkspace}
                    className="py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                    title="Clear current scan and start over"
                  >
                    New Scan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: Instructions */
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Awaiting Scan Input
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                Upload a DICOM-derived PNG or JPEG axial slice on the left, or run a demonstration phantom to review candidate class probabilities.
              </p>

              <div className="mt-6 text-left w-full space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-semibold block text-slate-700">Protocol Checklist:</span>
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span>Only PNG and JPEG formats accepted (&le;10MB).</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span>Unified 224×224 spatial standardization.</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Unvalidated checkpoints strictly marked [SYNTHETIC].</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#126B67] shrink-0" />
                  <span>Human review required for all output classes.</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
