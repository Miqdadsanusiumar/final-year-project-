# LungNet: Deployment & Setup Guide for Linux Mint and Cloud Run

This guide describes how to run and deploy LungNet locally on Linux Mint (or Ubuntu/Debian) as well as containerized on Google Cloud Run.

---

## 1. Local Setup on Linux Mint (Native Node + Python)

### Prerequisites
On Linux Mint (Linux Mint 21 / 22 or Ubuntu 22.04 / 24.04 LTS):
```bash
sudo apt update && sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl
```

### Option A: Running Full-Stack Dev Server (Node + Express + React SPA)
This runs the integrated full-stack server (identical to the cloud preview environment):
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server
npm run dev

# The app is now live at http://localhost:3000
```

### Option B: Running Python FastAPI Backend + React Frontend Separately
```bash
# 1. Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install ML and FastAPI requirements
pip install -r backend/requirements.txt

# 3. Launch FastAPI backend
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload

# In a second terminal, launch the frontend:
npm run dev
```

---

## 2. Docker Setup (Containerized)

To build and run the entire stack with Docker & Docker Compose:
```bash
# Build and start all containers in background
docker compose up --build -d

# Check running status
docker compose ps

# View backend logs
docker compose logs -f lungnet-backend

# Stop containers
docker compose down
```

---

## 3. Training Real Weights on GPU (Linux Mint / Workstation)

When you have access to a verified patient-partitioned dataset:
```bash
source venv/bin/activate

# Execute training with patient-split verification
python ml/train.py \
  --manifest data/patient_manifest.json \
  --arch efficientnet_b0 \
  --epochs 30 \
  --batch_size 32 \
  --output_dir ./checkpoints

# Point the backend to your trained checkpoint:
export MODEL_PATH="$(pwd)/checkpoints/best_efficientnet_b0.pt"
npm run dev
```

---

## 4. Google Cloud Run Deployment

To deploy containerized to Google Cloud Run:
```bash
# Set project configuration
export PROJECT_ID="your-gcp-project-id"
export REGION="europe-west2"

# 1. Build and push backend container to Google Artifact Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/lungnet-backend:v1 -f backend/Dockerfile .

# 2. Deploy to Cloud Run with environment variables
gcloud run deploy lungnet-backend \
  --image gcr.io/$PROJECT_ID/lungnet-backend:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars MODEL_PATH=""

# 3. Deploy full-stack frontend service
gcloud builds submit --tag gcr.io/$PROJECT_ID/lungnet-app:v1 -f Dockerfile.frontend .
gcloud run deploy lungnet-app \
  --image gcr.io/$PROJECT_ID/lungnet-app:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated
```
