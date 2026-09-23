/**
 * Core type definitions for LungNet Research Platform
 */

export type LungClass = 'Benign' | 'Malignant' | 'Normal';
export type ReviewStatus = 'unreviewed' | 'reviewed' | 'flagged';

export interface ClassScores {
  benign: number;
  malignant: number;
  normal: number;
}

export interface AnalysisCase {
  id: string;
  filename: string;
  file_size_bytes: number;
  mime_type?: string;
  dimensions?: { width: number; height: number };
  timestamp: string;
  is_synthetic: boolean;
  synthetic_label: string;
  predicted_class: LungClass;
  scores: ClassScores;
  processing_time_ms: number;
  review_status: ReviewStatus;
  review_notes?: string;
  reviewed_at?: string;
  image_preview_url: string;
  research_disclaimer: string;
}

export interface ModelInfo {
  architecture: string;
  status: string;
  version: string;
  checkpoint_loaded: boolean;
  model_path: string | null;
  input_spec: {
    resolution: [number, number];
    channels: number;
    color_space: string;
    normalization: {
      mean: number[];
      std: number[];
    };
    file_limits: {
      max_bytes: number;
      allowed_formats: string[];
    };
  };
  classes: Array<{
    id: string;
    label: LungClass;
    description: string;
  }>;
  metrics: {
    accuracy: number | null;
    macro_f1: number | null;
    sensitivity_malignant: number | null;
    specificity_malignant: number | null;
    auc_roc: number | null;
    display_status: string;
    statement: string;
  };
  research_disclaimer: string;
}

export interface DashboardStats {
  total_cases: number;
  benign_count: number;
  malignant_count: number;
  normal_count: number;
  synthetic_count: number;
  reviewed_count: number;
  validated_accuracy: string; // "Pending"
}

export interface HistoryResponse {
  cases: AnalysisCase[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}
