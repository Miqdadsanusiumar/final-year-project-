"""
LungNet ML Module: Model Architecture & Inference Pipeline
Candidate Architecture: EfficientNet-B0 with 3-Class Research Head
"""

import os
import io
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from typing import Dict, Any, Tuple, Optional

# Research Classes
CLASSES = ["Benign", "Malignant", "Normal"]
NUM_CLASSES = len(CLASSES)

# Preprocessing specification: 224x224 RGB, standard ImageNet normalization
INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def build_candidate_model(num_classes: int = 3, pretrained_backbone: bool = True) -> nn.Module:
    """
    Builds the proposed EfficientNet-B0 candidate model.
    Replaces the default 1000-class classifier head with a 3-class research classification head.
    """
    weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained_backbone else None
    model = models.efficientnet_b0(weights=weights)

    # In_features for EfficientNet-B0 classifier is 1280
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    return model


class LungNetPredictor:
    """
    Model serving wrapper.
    Attempts to load weights from MODEL_PATH. If absent or invalid, seamlessly
    operates in synthetic mock mode with is_synthetic: True explicitly flagged.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.getenv("MODEL_PATH")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = None
        self.is_synthetic_mode = True

        self._load_or_fallback()

    def _load_or_fallback(self):
        if self.model_path and os.path.isfile(self.model_path):
            try:
                print(f"[LungNet] Loading checkpoint from {self.model_path} onto {self.device}...")
                model = build_candidate_model(num_classes=NUM_CLASSES, pretrained_backbone=False)
                checkpoint = torch.load(self.model_path, map_location=self.device)
                state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()
                self.model = model
                self.is_synthetic_mode = False
                print("[LungNet] Calibrated weights successfully loaded.")
            except Exception as e:
                print(f"[LungNet Warning] Failed loading weights from {self.model_path}: {e}")
                print("[LungNet Warning] Engaging synthetic mock mode.")
                self.is_synthetic_mode = True
        else:
            print(f"[LungNet Notice] No checkpoint found at MODEL_PATH='{self.model_path}'. Running in synthetic mock mode.")
            self.is_synthetic_mode = True

    def preprocess_image(self, image_bytes: bytes) -> torch.Tensor:
        """
        Validates and converts image bytes to preprocessed torch Tensor.
        Handles grayscale CT conversion to 3-channel RGB.
        """
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        tensor = INFERENCE_TRANSFORMS(image)
        return tensor.unsqueeze(0)  # Shape: [1, 3, 224, 224]

    def predict(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Executes prediction or generates deterministic synthetic score.
        Always flags is_synthetic clearly.
        """
        if not self.is_synthetic_mode and self.model is not None:
            tensor = self.preprocess_image(image_bytes).to(self.device)
            with torch.no_grad():
                logits = self.model(tensor)
                probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()

            predicted_idx = int(probs.argmax())
            predicted_class = CLASSES[predicted_idx]
            scores = {
                "benign": round(float(probs[0]), 4),
                "malignant": round(float(probs[1]), 4),
                "normal": round(float(probs[2]), 4)
            }
            return {
                "is_synthetic": False,
                "synthetic_label": "Calibrated Weights Inference",
                "predicted_class": predicted_class,
                "scores": scores
            }
        else:
            # Deterministic mock calculation based on byte hash to prevent random flickering
            import hashlib
            h = hashlib.sha256(image_bytes).digest()
            val1 = (h[0] + (h[1] << 8)) / 65535.0
            val2 = (h[2] + (h[3] << 8)) / 65535.0
            val3 = (h[4] + (h[5] << 8)) / 65535.0

            total = val1 + val2 + val3
            p_benign = round(val1 / total, 3)
            p_malignant = round(val2 / total, 3)
            p_normal = round(1.0 - p_benign - p_malignant, 3)
            if p_normal < 0:
                p_normal = 0.01
                p_benign = round(1.0 - p_malignant - p_normal, 3)

            scores = {
                "benign": p_benign,
                "malignant": p_malignant,
                "normal": p_normal
            }
            pred = max(scores, key=scores.get).capitalize()

            return {
                "is_synthetic": True,
                "synthetic_label": "[SYNTHETIC] Candidate Mock Score — Weights Pending",
                "predicted_class": pred,
                "scores": scores
            }
