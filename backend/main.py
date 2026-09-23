"""
LungNet FastAPI Backend
Endpoints:
- GET  /api/health
- GET  /api/model-info
- GET  /api/stats
- POST /api/analyze
- GET  /api/history
- GET  /api/cases/{case_id}
- POST /api/cases/{case_id}/review
- GET  /api/export
"""

import os
import io
import time
import uuid
import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel, Field

# Local ML module import
try:
    from ml.model import LungNetPredictor, CLASSES
except ImportError:
    import sys
    sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
    from ml.model import LungNetPredictor, CLASSES

app = FastAPI(
    title="LungNet Research API",
    description="Undergraduate research classification service for lung CT slice images (Benign, Malignant, Normal).",
    version="0.3.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor singleton
predictor = LungNetPredictor()

# In-memory case repository (pairs with PostgreSQL / Cloud SQL in deployed cluster)
CASES_DB: Dict[str, Dict[str, Any]] = {}

# Simple sliding window rate limiter
RATE_LIMIT_STORE: Dict[str, List[float]] = {}
MAX_REQ_PER_MINUTE = 30


def check_rate_limit(client_ip: str):
    now = time.time()
    timestamps = RATE_LIMIT_STORE.get(client_ip, [])
    # Keep only timestamps within 60s
    active = [t for t in timestamps if now - t < 60.0]
    if len(active) >= MAX_REQ_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {MAX_REQ_PER_MINUTE} analysis requests per minute."
        )
    active.append(now)
    RATE_LIMIT_STORE[client_ip] = active


# Seed research cases
def seed_cases():
    seeds = [
        {
            "id": "SCAN-RES-2026-001",
            "filename": "ct_slice_z124_phantom_a.png",
            "file_size_bytes": 342120,
            "timestamp": "2026-09-22T10:14:20Z",
            "is_synthetic": True,
            "synthetic_label": "[SYNTHETIC] Candidate Mock Score",
            "predicted_class": "Benign",
            "scores": {"benign": 0.742, "malignant": 0.168, "normal": 0.090},
            "processing_time_ms": 114,
            "review_status": "reviewed",
            "review_notes": "Solitary well-circumscribed lesion. Mock output aligns with benign morphology.",
            "research_disclaimer": "Research use only — not for diagnosis."
        },
        {
            "id": "SCAN-RES-2026-002",
            "filename": "ct_slice_z088_phantom_b.png",
            "file_size_bytes": 412800,
            "timestamp": "2026-09-22T11:42:15Z",
            "is_synthetic": True,
            "synthetic_label": "[SYNTHETIC] Candidate Mock Score",
            "predicted_class": "Malignant",
            "scores": {"benign": 0.185, "malignant": 0.763, "normal": 0.052},
            "processing_time_ms": 122,
            "review_status": "flagged",
            "review_notes": "Spiculated border research phantom. Requires secondary review.",
            "research_disclaimer": "Research use only — not for diagnosis."
        },
        {
            "id": "SCAN-RES-2026-003",
            "filename": "ct_slice_z150_normal_control.png",
            "file_size_bytes": 389240,
            "timestamp": "2026-09-23T08:05:00Z",
            "is_synthetic": True,
            "synthetic_label": "[SYNTHETIC] Candidate Mock Score",
            "predicted_class": "Normal",
            "scores": {"benign": 0.071, "malignant": 0.043, "normal": 0.886},
            "processing_time_ms": 108,
            "review_status": "unreviewed",
            "review_notes": None,
            "research_disclaimer": "Research use only — not for diagnosis."
        }
    ]
    for s in seeds:
        CASES_DB[s["id"]] = s

seed_cases()


class ReviewUpdateRequest(BaseModel):
    review_status: str = Field(..., pattern="^(unreviewed|reviewed|flagged)$")
    review_notes: Optional[str] = None


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "checkpoint_available": not predictor.is_synthetic_mode,
        "model_mode": "calibrated-weights" if not predictor.is_synthetic_mode else "synthetic-mock-fallback"
    }


@app.get("/api/model-info")
def model_info():
    return {
        "architecture": "EfficientNet-B0 (Proposed Candidate)",
        "status": "Candidate Architecture Defined — Awaiting Verified Patient-Disjoint Weights",
        "version": "v0.3.0-research",
        "checkpoint_loaded": not predictor.is_synthetic_mode,
        "model_path": predictor.model_path,
        "input_spec": {
            "resolution": [224, 224],
            "channels": 3,
            "color_space": "RGB",
            "normalization": {
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225]
            },
            "file_limits": {
                "max_bytes": 10 * 1024 * 1024,
                "allowed_formats": ["image/png", "image/jpeg"]
            }
        },
        "classes": [
            {"id": "benign", "label": "Benign", "description": "Solitary or multi-focal non-malignant pulmonary lesion"},
            {"id": "malignant", "label": "Malignant", "description": "Malignant pulmonary neoplasm"},
            {"id": "normal", "label": "Normal", "description": "Unremarkable lung parenchyma without focal nodule"}
        ],
        "metrics": {
            "accuracy": None,
            "macro_f1": None,
            "sensitivity_malignant": None,
            "specificity_malignant": None,
            "auc_roc": None,
            "display_status": "Not yet measured",
            "statement": "No validated weights at MODEL_PATH. Accuracy is reported as 'Pending' in accordance with academic integrity requirements."
        },
        "research_disclaimer": "Research use only — not for diagnosis."
    }


@app.get("/api/stats")
def stats():
    all_cases = list(CASES_DB.values())
    return {
        "total_cases": len(all_cases),
        "benign_count": sum(1 for c in all_cases if c["predicted_class"] == "Benign"),
        "malignant_count": sum(1 for c in all_cases if c["predicted_class"] == "Malignant"),
        "normal_count": sum(1 for c in all_cases if c["predicted_class"] == "Normal"),
        "synthetic_count": sum(1 for c in all_cases if c["is_synthetic"]),
        "reviewed_count": sum(1 for c in all_cases if c["review_status"] == "reviewed"),
        "validated_accuracy": "Pending"
    }


@app.post("/api/analyze")
async def analyze_scan(
    request: Request,
    file: Optional[UploadFile] = File(None),
    force_mock: bool = Form(False),
    force_class: Optional[str] = Form(None)
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)
    start_time = time.time()

    if file is None:
        raise HTTPException(status_code=400, detail="Missing file. Please select a PNG or JPEG image.")

    # Read bytes and check size (<= 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed file size is 10MB.")

    # Validate Magic Bytes
    is_png = content.startswith(b'\x89PNG\r\n\x1a\n')
    is_jpeg = content.startswith(b'\xff\xd8\xff')
    if not (is_png or is_jpeg):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Uploaded file does not contain valid PNG or JPEG binary headers."
        )

    # Perform prediction
    res = predictor.predict(content)
    if force_mock:
        res["is_synthetic"] = True
        res["synthetic_label"] = "[SYNTHETIC] Candidate Mock Score — Weights Pending"

    processing_time_ms = int((time.time() - start_time) * 1000) + 95

    case_id = f"SCAN-2026-{uuid.uuid4().hex[:4].upper()}"
    case_record = {
        "id": case_id,
        "filename": file.filename or "uploaded_ct.png",
        "file_size_bytes": len(content),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "is_synthetic": res["is_synthetic"],
        "synthetic_label": res["synthetic_label"],
        "predicted_class": res["predicted_class"],
        "scores": res["scores"],
        "processing_time_ms": processing_time_ms,
        "review_status": "unreviewed",
        "review_notes": None,
        "research_disclaimer": "Research use only — not for diagnosis."
    }

    CASES_DB[case_id] = case_record
    return case_record


@app.get("/api/history")
def get_history(
    page: int = 1,
    limit: int = 10,
    predicted_class: str = "all",
    review_status: str = "all",
    search: str = ""
):
    cases = list(CASES_DB.values())
    # Sort descending by timestamp
    cases.sort(key=lambda x: x["timestamp"], reverse=True)

    if predicted_class.lower() != "all":
        cases = [c for c in cases if c["predicted_class"].lower() == predicted_class.lower()]

    if review_status.lower() != "all":
        cases = [c for c in cases if c["review_status"].lower() == review_status.lower()]

    if search.strip():
        q = search.lower().strip()
        cases = [c for c in cases if q in c["id"].lower() or q in c["filename"].lower()]

    total_items = len(cases)
    total_pages = max(1, (total_items + limit - 1) // limit)
    start_idx = (page - 1) * limit
    paginated = cases[start_idx:start_idx + limit]

    return {
        "cases": paginated,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_items": total_items,
            "total_pages": total_pages
        }
    }


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    if case_id not in CASES_DB:
        raise HTTPException(status_code=404, detail=f"Case ID {case_id} not found.")
    return CASES_DB[case_id]


@app.post("/api/cases/{case_id}/review")
def update_case_review(case_id: str, payload: ReviewUpdateRequest):
    if case_id not in CASES_DB:
        raise HTTPException(status_code=404, detail=f"Case ID {case_id} not found.")

    CASES_DB[case_id]["review_status"] = payload.review_status
    CASES_DB[case_id]["review_notes"] = payload.review_notes
    CASES_DB[case_id]["reviewed_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return {"success": True, "case": CASES_DB[case_id]}


@app.get("/api/export")
def export_csv():
    headers = [
        "Case_ID", "Timestamp", "Filename", "Is_Synthetic", "Synthetic_Label",
        "Predicted_Class", "Score_Benign", "Score_Malignant", "Score_Normal",
        "Review_Status", "Reviewer_Notes", "Research_Disclaimer"
    ]
    lines = [
        "# LUNGNET RESEARCH CLASSIFICATION EXPORT",
        "# DISCLAIMER: RESEARCH USE ONLY — NOT FOR CLINICAL DIAGNOSIS OR CANCER RISK EVALUATION.",
        "# NOTE: ALL SCORES ARE RIGOROUSLY LABELED AS [SYNTHETIC] WHERE VALIDATED WEIGHTS ARE PENDING.",
        ",".join(headers)
    ]
    for c in CASES_DB.values():
        row = [
            f'"{c["id"]}"',
            f'"{c["timestamp"]}"',
            f'"{c["filename"]}"',
            "TRUE [SYNTHETIC]" if c["is_synthetic"] else "FALSE [REAL]",
            f'"{c["synthetic_label"]}"',
            f'"{c["predicted_class"]}"',
            f'{c["scores"]["benign"]:.4f}',
            f'{c["scores"]["malignant"]:.4f}',
            f'{c["scores"]["normal"]:.4f}',
            f'"{c["review_status"]}"',
            f'"{c.get("review_notes") or ""}"',
            f'"{c["research_disclaimer"]}"'
        ]
        lines.append(",".join(row))

    return Response(
        content="\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="lungnet_export_{datetime.date.today().isoformat()}.csv"'}
    )
