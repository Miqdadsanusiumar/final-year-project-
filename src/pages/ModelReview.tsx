import React, { useState, useEffect } from 'react';
import {
  Layers,
  Cpu,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  FileText,
  Lock,
  RefreshCw,
  GitBranch,
  BookOpen
} from 'lucide-react';
import { ModelInfo } from '../types';

export const ModelReview: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuditTab, setSelectedAuditTab] = useState<number>(0);

  const fetchModelInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/model-info');
      if (!res.ok) throw new Error('Failed to retrieve model info.');
      const data: ModelInfo = await res.json();
      setModelInfo(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching model details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const AUDIT_CASES = [
    {
      title: "Flaw 1: '99% Accuracy' CNN Overlapping Subsets",
      severity: "Fatal Leakage",
      problem: "The legacy CNN notebook claimed >99% test accuracy by executing random slice-level train-test splits on 2D images without grouping by Patient ID.",
      mechanism: "Adjacent CT slices from the exact same patient (often spaced by only 1–2mm along the z-axis) were present in both training and test partitions. The network memorized unique anatomical quirks of individual patients rather than generalizing to novel pathology.",
      remediation: "Mandatory patient-disjoint split enforcement in ml/train.py. The pipeline computes patient set intersections across train, val, and test, raising an immediate fatal exception if any patient overlap occurs."
    },
    {
      title: "Flaw 2: EfficientNet-B7 Preprocessing Discrepancy",
      severity: "Pipeline Inconsistency",
      problem: "The EfficientNet-B7 experiment resized images with bicubic interpolation and standard ImageNet zero-centering during training, but evaluation passed unscaled uint8 tensors.",
      mechanism: "Training and inference distribution mismatch. Normalization statistics and interpolation artifacts drastically distorted activation feature maps, rendering evaluation numbers invalid.",
      remediation: "Implemented unified INFERENCE_TRANSFORMS applied identically during training evaluation, test evaluation, and production serving. Spatial dimension fixed at 224×224 with standard ImageNet channel means."
    },
    {
      title: "Flaw 3: Colon Histopathology Conflation in 'lung-cancer-detection'",
      severity: "Modality & Domain Mismatch",
      problem: "The notebook named 'lung-cancer-detection' used directory patterns that inadvertently loaded the LC25000 colon adenocarcinoma dataset rather than lung CT scans.",
      mechanism: "Histopathology microscopy slides (stained cellular biopsies) and Computed Tomography scans (radiodensity in Hounsfield Units) are completely distinct modalities with different physics, artifacts, and diagnostic criteria.",
      remediation: "Rigid boundary enforcement: LungNet is restricted strictly to pulmonary CT slices with thoracic windowing. Cross-tissue and cross-modality datasets are excluded."
    },
    {
      title: "Flaw 4: Unexecuted Pipelines & Fallback to Image-Level Splitting",
      severity: "Silent Degradation",
      problem: "LungNet_Model_Training contained an unexecuted patient-grouping regex. When an error occurred inside the grouping routine, a broad try...except block caught it and defaulted to train_test_split(shuffle=True).",
      mechanism: "The authors believed patient grouping was active, but runtime errors silently fell back to slice-level leakage.",
      remediation: "Zero silent fallbacks. If patient metadata is absent, malformed, or missing from the dataset manifest, the training pipeline refuses to run and exits with an explicit explanatory message."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Persistent Research Invariant */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102E36]">
            Candidate Model Architecture & Integrity Audit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Technical specification of the EfficientNet-B0 candidate and forensic audit of legacy notebook failure modes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Research use only — not for diagnosis</span>
          </div>

          <button
            onClick={fetchModelInfo}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh status"
            aria-label="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Top Architecture & Evaluation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Architecture Specifications (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#126B67]/10 flex items-center justify-center text-[#126B67]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {modelInfo?.architecture || 'EfficientNet-B0 (Proposed Candidate)'}
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  Status: {modelInfo?.status || 'Candidate Architecture Specified'}
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Proposed Candidate
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-1">Input Matrix:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">224 × 224 × 3</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">RGB / Windowed CT</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-1">Classifier Head:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">3 Logits (Softmax)</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">Dropout(0.3) + Linear(1280, 3)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-1">Backbone Complexity:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">~4.0M Parameters</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">Mobile Inverted Bottleneck (MBConv)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block mb-1">Weights Status:</span>
              <span className="font-mono font-bold text-amber-700 text-sm">
                {modelInfo?.checkpoint_loaded ? 'Weights Loaded' : 'Synthetic Mock Mode'}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                {modelInfo?.model_path ? modelInfo.model_path : 'MODEL_PATH not configured'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Class Taxonomy
            </h3>
            <div className="space-y-2 text-xs">
              {modelInfo?.classes.map(c => (
                <div key={c.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{c.label}:</span>
                    <span className="text-slate-600 ml-1.5">{c.description}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 uppercase">
                    ID: {c.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Honest Metric Reporting (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Evaluation Metrics
              </h2>
              <span className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                Pending Trial
              </span>
            </div>

            <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed mb-4">
              <strong>Non-Negotiable Research Invariant:</strong>
              <p className="mt-1">
                Zero accuracy, sensitivity, specificity, or AUC numbers are published in this interface until independent evaluation on a patient-disjoint held-out test cohort is executed.
              </p>
            </div>

            {/* Metrics Table: strictly Not yet measured */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Overall Accuracy:</span>
                <span className="text-slate-400 italic">Not yet measured</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Macro F1-Score:</span>
                <span className="text-slate-400 italic">Not yet measured</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Malignant Sensitivity:</span>
                <span className="text-slate-400 italic">Not yet measured</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Malignant Specificity:</span>
                <span className="text-slate-400 italic">Not yet measured</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-600">AUC-ROC (3-Class):</span>
                <span className="text-slate-400 italic">Not yet measured</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Source: <code className="text-[#126B67]">GET /api/model-info</code>
          </div>
        </div>
      </div>

      {/* Forensic Audit Section: The 4 Notebook Flaws */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-[#102E36] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#126B67]" />
              Forensic Audit: The Four Legacy Notebook Flaws
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed technical autopsy of prior methodological failures and how the current LungNet system remediates them
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {AUDIT_CASES.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedAuditTab(idx)}
              className={`p-3 text-left rounded-lg border text-xs transition-all ${
                selectedAuditTab === idx
                  ? 'bg-[#126B67] text-white border-[#126B67] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="block font-semibold truncate mb-1">
                {item.title.split(':')[0]}
              </span>
              <span className={`text-[10px] font-mono ${selectedAuditTab === idx ? 'text-teal-200' : 'text-slate-500'}`}>
                {item.severity}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Case Inspection */}
        {AUDIT_CASES[selectedAuditTab] && (
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {AUDIT_CASES[selectedAuditTab].title}
              </h3>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                {AUDIT_CASES[selectedAuditTab].severity}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-semibold text-rose-800 block mb-1">Observed Flaw:</span>
                <p className="text-slate-600 leading-relaxed">
                  {AUDIT_CASES[selectedAuditTab].problem}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-semibold text-amber-800 block mb-1">Failure Mechanism:</span>
                <p className="text-slate-600 leading-relaxed">
                  {AUDIT_CASES[selectedAuditTab].mechanism}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-teal-200 bg-teal-50/20">
                <span className="font-semibold text-teal-900 block mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#126B67]" />
                  LungNet Remediation:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {AUDIT_CASES[selectedAuditTab].remediation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reproducible Training Instructions Card */}
      <div className="bg-[#102E36] text-white rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-teal-300" />
            <h2 className="text-base font-bold">Independent GPU Training Pipeline</h2>
          </div>
          <span className="text-xs font-mono text-teal-300">
            ml/train.py
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The complete training script is bundled in <code className="text-teal-200">ml/train.py</code>.
          When run on a GPU workstation (e.g. Linux Mint or Cloud Run Vertex VM), it executes patient-disjoint partition validation, class-weighted cross-entropy loss, and early stopping.
        </p>

        <div className="bg-[#0B1F24] p-3 rounded-lg border border-slate-700 font-mono text-xs text-teal-200 overflow-x-auto">
          <code>
            python ml/train.py --manifest path/to/patient_manifest.json --arch efficientnet_b0 --epochs 30 --lr 0.0001
          </code>
        </div>
      </div>
    </div>
  );
};
