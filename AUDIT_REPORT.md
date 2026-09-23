# LungNet Research: Forensic Notebook Audit & Methodological Integrity Report

**Author:** LungNet ML & Systems Engineering Team  
**Date:** September 2026  
**Status:** Validated & Remediated  
**Regulatory Status:** Experimental Undergraduate Research — Not for Clinical Diagnosis  

---

## Executive Summary

Prior to this deployment, four legacy exploratory notebooks were audited to establish baseline veracity. Several critical methodological flaws were uncovered, confirming that historical "99% accuracy" assertions were artifacts of experimental error and catastrophic data leakage.

This report documents each failure mode, explains the underlying mechanism, and details the architectural remediations instituted in the current LungNet codebase.

---

## 1. Audit Findings: The Four Legacy Notebooks

### 1.1 Flaw 1: The "99% Accuracy" CNN Overlapping Subsets
* **Observation:** The notebook claiming $>99\%$ test accuracy utilized a naive random train-test-split over raw image slices without checking patient metadata or image hashes.
* **Failure Mechanism:** Multiple CT slices from the exact same patient volume (often adjacent z-axis slices separated by 1–2mm) were randomly assigned to both the training set and the test set. Because adjacent slices contain near-identical anatomical structures and nodule morphology, the network was merely memorizing patient morphology rather than generalizing to unseen pathology.
* **Remediation in LungNet:** 
  - Mandatory patient-level grouping (`verify_patient_disjoint_splits()` in `ml/train.py`).
  - Cryptographic slice-level hash checks preventing identical or near-identical images across partitions.
  - Rejection of any unstratified slice-level split.

### 1.2 Flaw 2: EfficientNet-B7 Preprocessing Discrepancy
* **Observation:** The EfficientNet-B7 experiment applied heavy resizing with bicubic interpolation and standard ImageNet zero-centering during training, but inference functions evaluated raw uint8 tensors with nearest-neighbor scaling and no normalization.
* **Failure Mechanism:** Inconsistent spatial transformation and pixel value distribution caused massive feature distortion during evaluation, rendering test numbers meaningless and unpredictably degrading inference calibration.
* **Remediation in LungNet:**
  - Unified `INFERENCE_TRANSFORMS` object shared strictly between `ml/train.py` and `ml/model.py`.
  - Fixed 224×224 resolution with bilinear sampling, ToTensor scaling ([0, 1]), and fixed ImageNet channel-wise standardization ($\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$).

### 1.3 Flaw 3: Colon Histopathology Dataset Substitution in "lung-cancer-detection"
* **Observation:** The notebook labeled `lung-cancer-detection` loaded the LC25000 dataset using directory patterns pointed at `colon_aca` (colon adenocarcinoma) and `colon_n` (benign colonic tissue) rather than lung histopathology or pulmonary CT scans.
* **Failure Mechanism:** The notebook claimed lung cancer detection while actually classifying colon tissue biopsies. Histopathology slides (stained cell microscopy) and pulmonary CT scans (cross-sectional volumetric radiodensity in Hounsfield Units) are entirely distinct modalities and cannot be conflated.
* **Remediation in LungNet:**
  - Rigid modality boundaries: LungNet is explicitly restricted to Pulmonary CT Slices.
  - Elimination of cross-tissue conflation.
  - Model input specification strictly expects axial CT slices with windowing appropriate for lung parenchyma.

### 1.4 Flaw 4: Unexecuted Pipelines & Fallback to Image-Level Splitting in `LungNet_Model_Training`
* **Observation:** The `LungNet_Model_Training` notebook possessed unexecuted pipeline blocks with syntax errors in the patient-grouping regex. When the grouping regex failed, a silent `try...except` block caught the exception and defaulted back to `train_test_split(shuffle=True)` on raw image filenames.
* **Failure Mechanism:** The user believed patient grouping was active, but runtime errors silently reverted the pipeline to image-level leakage.
* **Remediation in LungNet:**
  - Fail-fast enforcement: If patient mapping is missing, invalid, or corrupted, `ml/train.py` raises a fatal `ValueError` and halts execution immediately.
  - Zero silent fallbacks.

---

## 2. Integrity Commitments & Reporting Policy

1. **No Phantom Metrics:** No accuracy, sensitivity, specificity, or AUC metrics are published until patient-disjoint trial results are executed on an independent, held-out test cohort.
2. **Explicit Synthetic Labeling:** When running without validated weights, all outputs are programmatically flagged with `is_synthetic: true` and displayed with prominent `[SYNTHETIC]` visual warnings.
3. **Research-Use Invariant:** Every interface screen and exported data record explicitly states: *"Research use only — not for diagnosis."*
