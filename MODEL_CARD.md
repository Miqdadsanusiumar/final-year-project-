# Model Card: LungNet EfficientNet-B0 (Proposed Candidate)

## Model Overview
- **Model Name:** LungNet EfficientNet-B0
- **Version:** v0.3.0-research
- **Model Type:** Convolutional Neural Network (EfficientNet-B0 backbone with custom 3-class classification head)
- **Status:** Candidate Architecture Specified — Calibrated Weights Pending Patient-Disjoint Cohort Training
- **Date:** September 2026

## Intended Use
- **Primary Research Task:** Multi-class classification of axial lung computed tomography (CT) slices into three categories:
  1. **Benign:** Solitary or multifocal non-cancerous pulmonary nodules (e.g. granuloma, hamartoma).
  2. **Malignant:** Primary or secondary malignant pulmonary neoplasms (e.g. adenocarcinoma, squamous cell carcinoma).
  3. **Normal:** Unremarkable pulmonary parenchyma without focal nodule or mass.
- **Intended Audience:** Academic researchers, ML systems researchers, and biomedical engineering students studying computer vision applications in medical imaging.
- **Out of Scope & Prohibited Use:** 
  - Clinical diagnostic use in hospital or outpatient settings.
  - Automated triage or screening without human radiologist evaluation.
  - Interpretation of class scores as calibrated individual patient cancer risk.

## Input Specification
- **Modality:** Axial Pulmonary Computed Tomography (CT) Slice
- **Spatial Resolution:** 224 × 224 pixels
- **Channels:** 3 channels (RGB). Grayscale CT slice mapped across 3 channels or windowed (lung window / mediastinal window).
- **Normalization:** ImageNet distribution ($\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$).
- **File Formats Supported:** PNG, JPEG ($\le 10\text{MB}$).

## Output Specification
- **Classes:** `["Benign", "Malignant", "Normal"]`
- **Output Layer:** Linear projection from 1280 feature dimensions to 3 logits followed by Softmax normalization ($\sum p_i = 1.0$).
- **Calibration Status:** Uncalibrated. Scores reflect relative softmax outputs and must never be interpreted as calibrated clinical probabilities.

## Current Performance & Metrics
- **Accuracy:** `Pending`
- **Macro-F1:** `Not yet measured`
- **Malignant Sensitivity:** `Not yet measured`
- **Malignant Specificity:** `Not yet measured`
- **Reason:** In accordance with academic integrity guidelines, zero performance figures are reported until verified patient-disjoint training and independent evaluation have concluded.

## Bias, Risk & Limitations
- Slice-based models ignore 3D volumetric context (nodule volume doubling time, 3D spiculation, vascular convergence).
- Artifacts from motion, metal implants, low-dose reconstruction, or disparate scanner manufacturers (GE, Siemens, Philips) can degrade feature representation.
- Requires rigorous human-in-the-loop review for all analysis outputs.
