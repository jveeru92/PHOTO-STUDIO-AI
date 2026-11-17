/**
 * Category C — Background Segmentation (deterministic, offline).
 *
 * Background removal/replacement is performed entirely client-side in the
 * browser using deterministic image processing (border flood-fill
 * segmentation). No remote AI segmentation API, no MediaPipe, no ONNX,
 * no Transformers.js, no local model downloads.
 *
 * All segmentation logic lives in frontend/src/utils/image.ts
 * (floodFillBackgroundMask, autoSegmentImageData) and is applied in
 * frontend/src/hooks/usePassportStudio.ts.
 *
 * Zero-spend: runs entirely in the browser, no remote API, no API key,
 * no model downloads.
 */

import { autoSegmentImageData } from './image';

/**
 * Segment an image into foreground/background mask using deterministic
 * border flood-fill. No AI model is used.
 */
export function segmentImage(
  imageData: ImageData,
  fallbackTolerance: number = 40,
): { mask: Uint8ClampedArray; fgImageData: ImageData; method: 'floodfill' } {
  return {
    ...autoSegmentImageData(imageData, fallbackTolerance),
    method: 'floodfill',
  };
}

/**
 * Check if a segmenter is available. Always true (deterministic, no model needed).
 */
export function isSegmenterAvailable(): boolean {
  return true;
}

/**
 * Get the load error message, if any. Always null (no model to load).
 */
export function getSegmenterError(): string | null {
  return null;
}
