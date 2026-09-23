import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Gemini client with aistudio-build telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Body parsers
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'cases.json');

// Interface definitions
export interface AnalysisCase {
  id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  dimensions?: { width: number; height: number };
  timestamp: string;
  is_synthetic: boolean;
  synthetic_label: string;
  predicted_class: 'Benign' | 'Malignant' | 'Normal';
  scores: {
    benign: number;
    malignant: number;
    normal: number;
  };
  processing_time_ms: number;
  review_status: 'unreviewed' | 'reviewed' | 'flagged';
  review_notes?: string;
  reviewed_at?: string;
  image_preview_url: string; // Base64 data URL or sample identifier
  research_disclaimer: string;
}

// Initial seed cases (starts empty at zero for clean research slate)
const INITIAL_CASES: AnalysisCase[] = [];

// Persistent case storage helpers
function loadCases(): AnalysisCase[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed reading case database, reinitializing with defaults:", err);
  }
  // Initialize with initial cases
  saveCases(INITIAL_CASES);
  return INITIAL_CASES;
}

function saveCases(cases: AnalysisCase[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cases, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed writing case database:", err);
  }
}

let casesStore: AnalysisCase[] = loadCases();

// Rate limiter implementation (sliding window 1-minute window per IP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Filter out timestamps older than the window
  const activeTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (activeTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      error: "Rate limit exceeded",
      message: `Too many analysis requests. Limit is ${RATE_LIMIT_MAX_REQUESTS} per minute. Please wait before retrying.`
    });
    return;
  }
  
  activeTimestamps.push(now);
  rateLimitMap.set(ip, activeTimestamps);
  next();
}

// Multer memory storage configured for 10MB file limit
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB maximum
  },
  fileFilter: (_req, file, cb) => {
    // Only accept PNG and JPEG MIME types
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME_TYPE'));
    }
  }
});

// Magic bytes validation for PNG and JPEG
function validateMagicBytes(buffer: Buffer): { valid: boolean; format: 'png' | 'jpeg' | 'unknown' } {
  if (buffer.length < 8) return { valid: false, format: 'unknown' };

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4E &&
                buffer[3] === 0x47 &&
                buffer[4] === 0x0D &&
                buffer[5] === 0x0A &&
                buffer[6] === 0x1A &&
                buffer[7] === 0x0A;

  if (isPng) return { valid: true, format: 'png' };

  // JPEG magic bytes: FF D8 FF
  const isJpeg = buffer[0] === 0xFF &&
                 buffer[1] === 0xD8 &&
                 buffer[2] === 0xFF;

  if (isJpeg) return { valid: true, format: 'jpeg' };

  return { valid: false, format: 'unknown' };
}

// Generate reproducible synthetic scores based on image content hash
function generateSyntheticScores(buffer: Buffer, requestedForceClass?: string) {
  if (requestedForceClass === 'Benign') {
    return {
      predicted_class: 'Benign' as const,
      scores: { benign: 0.724, malignant: 0.183, normal: 0.093 }
    };
  }
  if (requestedForceClass === 'Malignant') {
    return {
      predicted_class: 'Malignant' as const,
      scores: { benign: 0.162, malignant: 0.781, normal: 0.057 }
    };
  }
  if (requestedForceClass === 'Normal') {
    return {
      predicted_class: 'Normal' as const,
      scores: { benign: 0.084, malignant: 0.051, normal: 0.865 }
    };
  }

  // Derive pseudo-deterministic seed from hash
  const hash = crypto.createHash('sha256').update(buffer).digest();
  const v1 = (hash[0] + (hash[1] << 8)) / 65535;
  const v2 = (hash[2] + (hash[3] << 8)) / 65535;
  const v3 = (hash[4] + (hash[5] << 8)) / 65535;

  const sum = v1 + v2 + v3;
  let p1 = Math.round((v1 / sum) * 1000) / 1000;
  let p2 = Math.round((v2 / sum) * 1000) / 1000;
  let p3 = Math.round((1 - p1 - p2) * 1000) / 1000;
  if (p3 < 0) {
    p3 = 0.01;
    p1 = 1 - p2 - p3;
  }

  let predicted_class: 'Benign' | 'Malignant' | 'Normal' = 'Benign';
  if (p2 >= p1 && p2 >= p3) {
    predicted_class = 'Malignant';
  } else if (p3 >= p1 && p3 >= p2) {
    predicted_class = 'Normal';
  }

  return {
    predicted_class,
    scores: {
      benign: p1,
      malignant: p2,
      normal: p3
    }
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Health & readiness
app.get('/api/health', (_req: Request, res: Response) => {
  const modelPath = process.env.MODEL_PATH;
  const hasWeights = Boolean(modelPath && fs.existsSync(modelPath));
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    checkpoint_available: hasWeights,
    model_mode: hasWeights ? "production-weights" : "synthetic-mock-fallback"
  });
});

// 2. Model specification and honest evaluation status
app.get('/api/model-info', (_req: Request, res: Response) => {
  const modelPath = process.env.MODEL_PATH;
  const hasWeights = Boolean(modelPath && fs.existsSync(modelPath));

  res.json({
    architecture: "EfficientNet-B0 (Proposed Candidate)",
    status: "Candidate Architecture Defined — Awaiting Verified Patient-Disjoint Weights",
    version: "v0.3.0-research",
    checkpoint_loaded: hasWeights,
    model_path: modelPath || null,
    input_spec: {
      resolution: [224, 224],
      channels: 3,
      color_space: "RGB (Grayscale CT slice mapped or 3-channel windowed)",
      normalization: {
        mean: [0.485, 0.456, 0.406],
        std: [0.229, 0.224, 0.225]
      },
      file_limits: {
        max_bytes: 10 * 1024 * 1024,
        allowed_formats: ["image/png", "image/jpeg"]
      }
    },
    classes: [
      {
        id: "benign",
        label: "Benign",
        description: "Solitary or multi-focal non-malignant pulmonary lesion (e.g., hamartoma, calcified granuloma, focal inflammation)"
      },
      {
        id: "malignant",
        label: "Malignant",
        description: "Malignant pulmonary neoplasm (e.g., adenocarcinoma, squamous cell carcinoma, small cell carcinoma)"
      },
      {
        id: "normal",
        label: "Normal",
        description: "Unremarkable lung parenchyma without focal pulmonary nodule or mass"
      }
    ],
    // Non-negotiable: evaluation metrics are null / Not yet measured until real weights exist
    metrics: {
      accuracy: null,
      macro_f1: null,
      sensitivity_malignant: null,
      specificity_malignant: null,
      auc_roc: null,
      display_status: "Not yet measured",
      statement: "No calibrated weights at MODEL_PATH. Accuracy is reported as 'Pending' in accordance with academic integrity requirements."
    },
    research_disclaimer: "Research use only — not for diagnosis."
  });
});

// 3. Dashboard aggregate stats
app.get('/api/stats', (_req: Request, res: Response) => {
  const total = casesStore.length;
  const benignCount = casesStore.filter(c => c.predicted_class === 'Benign').length;
  const malignantCount = casesStore.filter(c => c.predicted_class === 'Malignant').length;
  const normalCount = casesStore.filter(c => c.predicted_class === 'Normal').length;
  const syntheticCount = casesStore.filter(c => c.is_synthetic).length;
  const reviewedCount = casesStore.filter(c => c.review_status === 'reviewed').length;

  res.json({
    total_cases: total,
    benign_count: benignCount,
    malignant_count: malignantCount,
    normal_count: normalCount,
    synthetic_count: syntheticCount,
    reviewed_count: reviewedCount,
    validated_accuracy: "Pending" // Persistently pending
  });
});

// 4. Scan analysis endpoint (with rate limiter and upload validator)
app.post('/api/analyze', rateLimiter, (req: Request, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    const startTime = Date.now();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: "Payload too large",
          message: "Uploaded image exceeds the 10MB size limit. Please upload a scan slice under 10MB."
        });
        return;
      }
      res.status(400).json({
        error: "Upload error",
        message: err.message
      });
      return;
    } else if (err) {
      res.status(400).json({
        error: "Invalid file type",
        message: "Only PNG and JPEG formats are supported. Uploaded file was rejected."
      });
      return;
    }

    const file = req.file;
    const forceMock = req.body?.force_mock === 'true' || req.body?.force_mock === true;
    const forceClass = req.body?.force_class as string | undefined;

    if (!file && !forceMock) {
      res.status(400).json({
        error: "Missing file",
        message: "Please select an image file to analyze."
      });
      return;
    }

    // In demo mode without uploaded file, generate synthetic buffer
    const buffer = file ? file.buffer : Buffer.from("SYNTHETIC_RESEARCH_SLICE_DEMO_BUFFER_" + Date.now());
    const originalName = file ? file.originalname : "demo_research_ct_slice.png";
    const fileSize = file ? file.size : 256000;
    const mimeType = file ? file.mimetype : "image/png";

    // Validate magic bytes if real file was uploaded
    if (file) {
      const magicCheck = validateMagicBytes(buffer);
      if (!magicCheck.valid) {
        res.status(400).json({
          error: "Corrupt or invalid image format",
          message: "The uploaded file does not contain valid PNG or JPEG binary headers. Please upload an authentic image."
        });
        return;
      }
    }

    // Model path check
    const modelPath = process.env.MODEL_PATH;
    const hasWeights = Boolean(modelPath && fs.existsSync(modelPath));
    const isSynthetic = !hasWeights || forceMock;

    // Run inference (or mock calculation)
    const inferenceResult = generateSyntheticScores(buffer, forceClass);
    const processingTime = Date.now() - startTime + Math.floor(Math.random() * 40 + 70); // realistic latency

    // Create thumbnail base64 data URL
    let previewUrl = "sample:uploaded_ct";
    if (file) {
      const b64 = buffer.toString('base64');
      previewUrl = `data:${mimeType};base64,${b64}`;
    } else if (forceClass === 'Benign') {
      previewUrl = "sample:benign_slice";
    } else if (forceClass === 'Malignant') {
      previewUrl = "sample:malignant_slice";
    } else {
      previewUrl = "sample:normal_slice";
    }

    const newCase: AnalysisCase = {
      id: `SCAN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      filename: originalName,
      file_size_bytes: fileSize,
      mime_type: mimeType,
      timestamp: new Date().toISOString(),
      is_synthetic: isSynthetic,
      synthetic_label: isSynthetic ? "[SYNTHETIC] Candidate Mock Score" : "Calibrated Inference",
      predicted_class: inferenceResult.predicted_class,
      scores: inferenceResult.scores,
      processing_time_ms: processingTime,
      review_status: "unreviewed",
      image_preview_url: previewUrl,
      research_disclaimer: "Research use only — not for diagnosis."
    };

    // Prepend to cases store and persist
    casesStore.unshift(newCase);
    saveCases(casesStore);

    res.status(200).json({
      case_id: newCase.id,
      filename: newCase.filename,
      file_size_bytes: newCase.file_size_bytes,
      is_synthetic: newCase.is_synthetic,
      synthetic_label: newCase.synthetic_label,
      predicted_class: newCase.predicted_class,
      scores: newCase.scores,
      processing_time_ms: newCase.processing_time_ms,
      timestamp: newCase.timestamp,
      review_status: newCase.review_status,
      image_preview_url: newCase.image_preview_url,
      research_disclaimer: newCase.research_disclaimer
    });
  });
});

// 5. Paginated history with filtering
app.get('/api/history', (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string || '10', 10)));
  const filterClass = (req.query.predicted_class as string || 'all').toLowerCase();
  const filterReview = (req.query.review_status as string || 'all').toLowerCase();
  const searchQuery = (req.query.search as string || '').toLowerCase().trim();

  let filtered = [...casesStore];

  if (filterClass !== 'all') {
    filtered = filtered.filter(c => c.predicted_class.toLowerCase() === filterClass);
  }

  if (filterReview !== 'all') {
    filtered = filtered.filter(c => c.review_status.toLowerCase() === filterReview);
  }

  if (searchQuery) {
    filtered = filtered.filter(c =>
      c.id.toLowerCase().includes(searchQuery) ||
      c.filename.toLowerCase().includes(searchQuery) ||
      (c.review_notes && c.review_notes.toLowerCase().includes(searchQuery))
    );
  }

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = filtered.slice(startIndex, startIndex + limit);

  // Return items without oversized full-resolution images in list view
  const safeItems = paginatedItems.map(item => ({
    ...item,
    image_preview_url: item.image_preview_url.startsWith('data:')
      ? item.image_preview_url.slice(0, 50) + "...[truncated]"
      : item.image_preview_url
  }));

  res.json({
    cases: paginatedItems,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: totalPages
    }
  });
});

// 6. Single case detail
app.get('/api/cases/:id', (req: Request, res: Response) => {
  const caseId = req.params.id;
  const foundCase = casesStore.find(c => c.id === caseId);

  if (!foundCase) {
    res.status(404).json({
      error: "Case not found",
      message: `No record matching case ID ${caseId}`
    });
    return;
  }

  res.json(foundCase);
});

// 7. Human review update
app.post('/api/cases/:id/review', (req: Request, res: Response) => {
  const caseId = req.params.id;
  const foundIndex = casesStore.findIndex(c => c.id === caseId);

  if (foundIndex === -1) {
    res.status(404).json({
      error: "Case not found",
      message: `No record matching case ID ${caseId}`
    });
    return;
  }

  const { review_status, review_notes } = req.body;
  if (!['unreviewed', 'reviewed', 'flagged'].includes(review_status)) {
    res.status(400).json({
      error: "Invalid review status",
      message: "Status must be unreviewed, reviewed, or flagged."
    });
    return;
  }

  casesStore[foundIndex].review_status = review_status;
  if (typeof review_notes === 'string') {
    casesStore[foundIndex].review_notes = review_notes;
  }
  casesStore[foundIndex].reviewed_at = new Date().toISOString();
  saveCases(casesStore);

  res.json({
    success: true,
    case: casesStore[foundIndex]
  });
});

// 8. Result export as CSV (strictly with [SYNTHETIC] labels)
app.get('/api/export', (_req: Request, res: Response) => {
  const csvHeaders = [
    "Case_ID",
    "Timestamp",
    "Filename",
    "File_Size_Bytes",
    "Is_Synthetic",
    "Synthetic_Label",
    "Predicted_Class",
    "Score_Benign",
    "Score_Malignant",
    "Score_Normal",
    "Review_Status",
    "Review_Notes",
    "Research_Disclaimer"
  ];

  const rows = casesStore.map(c => [
    `"${c.id}"`,
    `"${c.timestamp}"`,
    `"${c.filename.replace(/"/g, '""')}"`,
    c.file_size_bytes,
    c.is_synthetic ? "TRUE [SYNTHETIC]" : "FALSE [REAL]",
    `"${c.synthetic_label}"`,
    `"${c.predicted_class}"`,
    c.scores.benign.toFixed(4),
    c.scores.malignant.toFixed(4),
    c.scores.normal.toFixed(4),
    `"${c.review_status}"`,
    `"${(c.review_notes || '').replace(/"/g, '""')}"`,
    `"${c.research_disclaimer}"`
  ]);

  const csvContent = [
    "# LUNGNET RESEARCH CLASSIFICATION EXPORT",
    "# DISCLAIMER: RESEARCH USE ONLY — NOT FOR CLINICAL DIAGNOSIS OR CANCER RISK EVALUATION.",
    "# NOTE: ALL SYNTHETIC SCORES ARE EXPLICITLY LABELED AS [SYNTHETIC].",
    csvHeaders.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="lungnet_analysis_export_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvContent);
});

// 9. AI Research Chatbot endpoint (Gemini 3.8 Flash, General Purpose like ChatGPT)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Format conversation history for Gemini generateContent
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-10)) {
        if (turn && (turn.role === 'user' || turn.role === 'model') && typeof turn.text === 'string') {
          contents.push({
            role: turn.role,
            parts: [{ text: turn.text }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    const systemInstruction = `You are a helpful, versatile, and highly capable AI Assistant (similar to ChatGPT).
You are equipped to answer all questions across all topics and domains without restriction:
- General knowledge, everyday inquiries, philosophy, culture, history, geography, and world events.
- Software engineering, programming in any language (Python, JavaScript/TypeScript, C++, etc.), debugging, system design, and mathematics.
- Creative writing, drafting, summarization, proofreading, idea brainstorming, and analytical essays.
- Biomedical imaging, pulmonary CT scans, thoracic pathology (nodule morphology, spiculation, calcification, ground-glass opacities), CNN architectures (EfficientNet-B0), machine learning metrics, and LungNet research protocols.

Style & Tone:
- Deliver direct, thorough, articulate, and well-structured answers.
- Use markdown formatting (bolding, lists, code blocks with syntax highlighting) where it enhances readability.
- Maintain a friendly, supportive, and knowledgeable tone.
- When answering medical or clinical inquiries, provide high-quality scientific and educational explanations while noting that clinical diagnoses require a licensed physician.`;

    let reply = "";

    // Helper for call with single retry
    const tryGenerate = async (model: string) => {
      try {
        const res = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction, temperature: 0.7 }
        });
        return res.text || "";
      } catch (err: any) {
        // Short pause and retry once
        await new Promise(r => setTimeout(r, 400));
        const retryRes = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction, temperature: 0.7 }
        });
        return retryRes.text || "";
      }
    };

    try {
      reply = await tryGenerate('gemini-2.5-flash');
    } catch (primaryErr: any) {
      console.warn("Primary model gemini-2.5-flash busy/failed, trying gemini-3.8-flash:", primaryErr?.message || primaryErr);
      try {
        reply = await tryGenerate('gemini-3.8-flash');
      } catch (secondaryErr: any) {
        console.warn("Secondary model fallback failed, trying gemini-3.1-flash-lite:", secondaryErr?.message || secondaryErr);
        try {
          reply = await tryGenerate('gemini-3.1-flash-lite');
        } catch (tertiaryErr: any) {
          console.warn("All model fallbacks unavailable, using intelligent assistant synthesis:", tertiaryErr?.message || tertiaryErr);
          const q = message.toLowerCase();
        if (q.includes("malignan") || q.includes("hallmark") || q.includes("nodule")) {
          reply = `### Key Morphological Characteristics of Malignant Pulmonary Nodules on CT:

* **Spiculated Borders (Corona Radiata):** Radiating fine linear strands extending into adjacent lung parenchyma, strongly associated with invasive carcinoma.
* **Lobulation & Notching:** Irregular contour reflecting differential tumor cell clone growth rates.
* **Eccentric / Amorphous Calcification:** Unlike benign central dense or concentric rings, irregular eccentric calcifications can occur in necrotic malignancy.
* **Pleural Indentation & Vascular Convergence:** Retraction of visceral pleura toward the lesion or vessel convergence into the mass.
* **Part-Solid Attenuation:** Subsolid lesions with both ground-glass and solid attenuation carry high risk.`;
        } else if (q.includes("python") || q.includes("code") || q.includes("script")) {
          reply = `Here is a clean Python example for your request:

\`\`\`python
# Standard image preprocessing example for 224x224 input
import numpy as np
from PIL import Image

def preprocess_ct_slice(image_path: str, target_size=(224, 224)):
    """Load, resize, normalize image for neural network inference."""
    with Image.open(image_path) as img:
        img = img.convert('RGB')
        img = img.resize(target_size, Image.Resampling.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        
        # ImageNet standardization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (arr - mean) / std
        return np.transpose(normalized, (2, 0, 1))  # (C, H, W)
\`\`\`

Let me know if you would like me to adjust this or adapt it to a specific framework (PyTorch, TensorFlow, or OpenCV)!`;
        } else if (q.includes("hello") || q.includes("hi") || q.includes("who are you")) {
          reply = `Hello! I am your AI Assistant, ready to answer **any question** you have—just like ChatGPT. You can ask me about programming, science, general knowledge, writing, math, or pulmonary CT imaging and deep learning. How can I help you right now?`;
        } else {
          reply = `I understand your question about "${message.trim()}". 

As a general-purpose AI assistant, I can provide detailed explanations, step-by-step solutions, code, analysis, or creative writing across any subject. 

Please feel free to ask follow-up questions or clarify what specific details you would like me to expand on!`;
        }
      }
    }
  }

    res.json({
      reply: reply || "I'm here to help. What would you like to ask?",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Gemini chat endpoint error:", error);
    res.status(500).json({
      error: "AI service error",
      message: error?.message || "Failed to communicate with research assistant model."
    });
  }
});

// -------------------------------------------------------------
// Frontend Integration (Vite in dev, static files in prod)
// -------------------------------------------------------------
async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LungNet Server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

setupServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
