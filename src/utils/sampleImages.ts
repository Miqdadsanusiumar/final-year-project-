/**
 * High-fidelity vector/canvas research CT slice representations.
 * Self-contained without external dependencies or fragile CDNs.
 */

export const SAMPLE_CT_SLICES = {
  benign: {
    id: "sample:benign_slice",
    title: "Research Phantom A: Benign Calcified Solitary Nodule",
    filename: "sample_ct_benign_phantom.png",
    description: "Well-circumscribed smooth-bordered 12mm solitary nodule in peripheral right lung parenchyma.",
    category: "Benign" as const,
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#0B1317"/>
        <!-- Thoracic cavity boundary -->
        <ellipse cx="200" cy="200" rx="175" ry="155" fill="#141E24" stroke="#2D3E4A" stroke-width="6"/>
        <!-- Spine and vertebra -->
        <path d="M 180 345 L 220 345 L 210 310 L 190 310 Z" fill="#DCE5EB"/>
        <circle cx="200" cy="328" r="8" fill="#141E24"/>
        <!-- Sternum -->
        <rect x="190" y="52" width="20" height="8" rx="3" fill="#DCE5EB"/>
        <!-- Rib cage silhouettes -->
        <path d="M 50 140 Q 60 170 70 200" stroke="#7A93A3" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M 45 190 Q 55 220 70 250" stroke="#7A93A3" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M 350 140 Q 340 170 330 200" stroke="#7A93A3" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M 355 190 Q 345 220 330 250" stroke="#7A93A3" stroke-width="5" fill="none" stroke-linecap="round"/>
        <!-- Mediastinum & Heart silhouette -->
        <path d="M 170 90 C 180 80, 220 80, 230 90 C 250 150, 240 260, 215 310 C 190 310, 160 260, 165 170 Z" fill="#1E2C35"/>
        <!-- Left Lung Field (Dark low-density parenchyma) -->
        <path d="M 160 100 C 120 95, 75 125, 70 180 C 65 245, 95 300, 160 305 C 160 260, 155 180, 160 100 Z" fill="#060A0D"/>
        <!-- Right Lung Field -->
        <path d="M 240 100 C 280 95, 325 125, 330 180 C 335 245, 305 300, 240 305 C 240 260, 245 180, 240 100 Z" fill="#060A0D"/>
        <!-- Pulmonary Bronchovascular Markings -->
        <path d="M 155 180 Q 120 190 95 185 M 155 200 Q 110 230 90 250" stroke="#253540" stroke-width="2" fill="none"/>
        <path d="M 245 180 Q 280 190 305 185 M 245 200 Q 290 230 310 250" stroke="#253540" stroke-width="2" fill="none"/>
        <!-- Solitary Benign Nodule (Smooth, well-defined circular lesion with central calcification) -->
        <circle cx="112" cy="170" r="14" fill="#6B8594" stroke="#8EA5B5" stroke-width="1"/>
        <circle cx="112" cy="170" r="6" fill="#F1F5F9"/>
        <!-- Calibration Grid Overlay -->
        <line x1="20" y1="200" x2="35" y2="200" stroke="#486577" stroke-width="1"/>
        <line x1="200" y1="20" x2="200" y2="35" stroke="#486577" stroke-width="1"/>
        <text x="25" y="380" font-family="monospace" font-size="10" fill="#718B9B">CT AXIAL - R: UPPER LOBE - SLICE #124</text>
      </svg>
    `)}`
  },
  malignant: {
    id: "sample:malignant_slice",
    title: "Research Phantom B: Malignant Spiculated Neoplasm",
    filename: "sample_ct_malignant_phantom.png",
    description: "28mm irregular, spiculated mass with pleural retraction in left lower pulmonary lobe.",
    category: "Malignant" as const,
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#0B1317"/>
        <!-- Thoracic cavity boundary -->
        <ellipse cx="200" cy="200" rx="175" ry="155" fill="#141E24" stroke="#2D3E4A" stroke-width="6"/>
        <!-- Spine and vertebra -->
        <path d="M 180 345 L 220 345 L 210 310 L 190 310 Z" fill="#DCE5EB"/>
        <circle cx="200" cy="328" r="8" fill="#141E24"/>
        <!-- Rib cage silhouettes -->
        <path d="M 50 140 Q 60 170 70 200" stroke="#7A93A3" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M 350 140 Q 340 170 330 200" stroke="#7A93A3" stroke-width="5" fill="none" stroke-linecap="round"/>
        <!-- Mediastinum & Heart -->
        <path d="M 170 90 C 180 80, 220 80, 230 90 C 250 150, 240 260, 215 310 C 190 310, 160 260, 165 170 Z" fill="#1E2C35"/>
        <!-- Lung Fields -->
        <path d="M 160 100 C 120 95, 75 125, 70 180 C 65 245, 95 300, 160 305 C 160 260, 155 180, 160 100 Z" fill="#060A0D"/>
        <path d="M 240 100 C 280 95, 325 125, 330 180 C 335 245, 305 300, 240 305 C 240 260, 245 180, 240 100 Z" fill="#060A0D"/>
        <!-- Pulmonary Vascular Markings -->
        <path d="M 155 180 Q 120 190 95 185" stroke="#253540" stroke-width="2" fill="none"/>
        <path d="M 245 180 Q 280 190 305 185" stroke="#253540" stroke-width="2" fill="none"/>
        <!-- Malignant Spiculated Mass (Irregular star-shaped contours, pleural tethering) -->
        <path d="M 275 220 L 290 208 L 295 218 L 312 212 L 305 228 L 322 235 L 304 242 L 314 258 L 296 250 L 285 264 L 282 246 L 268 238 Z" fill="#9FB4C2" stroke="#BACCD8" stroke-width="1.5"/>
        <!-- Pleural retraction line reaching rib boundary -->
        <line x1="312" y1="212" x2="335" y2="198" stroke="#7A93A3" stroke-width="1.5" stroke-dasharray="2,2"/>
        <text x="25" y="380" font-family="monospace" font-size="10" fill="#718B9B">CT AXIAL - L: LOWER LOBE - SLICE #088</text>
      </svg>
    `)}`
  },
  normal: {
    id: "sample:normal_slice",
    title: "Research Control C: Normal Pulmonary Parenchyma",
    filename: "sample_ct_normal_control.png",
    description: "Clear bilateral pulmonary fields with normal vascular tapering and no focal lesion.",
    category: "Normal" as const,
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#0B1317"/>
        <!-- Thoracic cavity boundary -->
        <ellipse cx="200" cy="200" rx="175" ry="155" fill="#141E24" stroke="#2D3E4A" stroke-width="6"/>
        <!-- Spine and vertebra -->
        <path d="M 180 345 L 220 345 L 210 310 L 190 310 Z" fill="#DCE5EB"/>
        <circle cx="200" cy="328" r="8" fill="#141E24"/>
        <!-- Lung Fields -->
        <path d="M 160 100 C 120 95, 75 125, 70 180 C 65 245, 95 300, 160 305 C 160 260, 155 180, 160 100 Z" fill="#060A0D"/>
        <path d="M 240 100 C 280 95, 325 125, 330 180 C 335 245, 305 300, 240 305 C 240 260, 245 180, 240 100 Z" fill="#060A0D"/>
        <!-- Delicate symmetric bronchovascular markings -->
        <path d="M 155 180 Q 125 188 105 180 M 155 205 Q 120 225 100 240 M 155 150 Q 125 140 110 130" stroke="#253540" stroke-width="2" fill="none"/>
        <path d="M 245 180 Q 275 188 295 180 M 245 205 Q 280 225 300 240 M 245 150 Q 275 140 290 130" stroke="#253540" stroke-width="2" fill="none"/>
        <text x="25" y="380" font-family="monospace" font-size="10" fill="#718B9B">CT AXIAL - BILATERAL - SLICE #150</text>
      </svg>
    `)}`
  }
};

export function resolveImagePreview(url: string): string {
  if (url === "sample:benign_slice") return SAMPLE_CT_SLICES.benign.svgDataUri;
  if (url === "sample:malignant_slice") return SAMPLE_CT_SLICES.malignant.svgDataUri;
  if (url === "sample:normal_slice") return SAMPLE_CT_SLICES.normal.svgDataUri;
  return url;
}
