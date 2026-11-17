/**
 * Category C — Background Segmentation & Image Enhancement
 *
 * Uses MediaPipe Image Segmenter (Selfie Segmentation model) for browser-based
 * foreground/background segmentation. Falls back to deterministic chroma
 * segmentation (border flood-fill) when MediaPipe is unavailable or fails.
 *
 * Zero-spend: runs entirely in the browser via WebAssembly. No remote API,
 * no API key, no billing.
 *
 * Model: selfie_segmentation_landscape (approx 5MB)
 *   - Good for portrait photos with people
 *   - Decent hair edge preservation
 *   - Works when subject touches frame edge (unlike flood-fill fallback)
 */

import {
  ImageSegmenter,
  FilesetResolver,
  type ImageSegmenterResult,
} from '@mediapipe/tasks-vision';
import { autoSegmentImageData } from './image';

let segmenter: ImageSegmenter | null = null;
let isLoading = false;
let loadError: string | null = null;

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmentation_landscape/float16/latest/selfie_segmentation_landscape.tflite';

/**
 * Initialize the MediaPipe Image Segmenter. Call once at app startup.
 * Returns true if ready, false if fallback should be used.
 */
export async function initSegmenter(): Promise<boolean> {
  if (segmenter) return true;
  if (isLoading) {
    // Wait for in-flight load
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 50));
      if (segmenter) return true;
      if (loadError) return false;
    }
    return false;
  }

  isLoading = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU', // CPU for broader compatibility; GPU not available in all browsers
      },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
    });
    return true;
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
    console.warn('MediaPipe Image Segmenter failed to load:', loadError);
    segmenter = null;
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Segment an image into foreground/background mask using MediaPipe.
 * Falls back to flood-fill segmentation if MediaPipe is unavailable or fails.
 *
 * Returns { mask, fgImageData } where:
 *   mask: Uint8ClampedArray, 255 = foreground, 0 = background
 *   fgImageData: ImageData with premultiplied RGB over transparent alpha
 */
export function segmentImage(
  imageData: ImageData,
  fallbackTolerance: number = 40
): { mask: Uint8ClampedArray; fgImageData: ImageData; method: 'mediapipe' | 'floodfill' } {
  const { width, height } = imageData;
  const data = imageData.data;

  // Try MediaPipe first
  if (segmenter) {
    try {
      // Create an ImageData-compatible canvas for MediaPipe
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);

      const results = segmenter.segment(canvas) as ImageSegmenterResult;
      const categoryMask = results.categoryMask;

      if (!categoryMask) {
        throw new Error('Segmentation result has no mask');
      }

      // MediaPipe categoryMask: buffer contains category indices (0 = background, 1 = foreground)
      const maskBuf = (categoryMask as any).buffer as Float32Array;
      const mask = new Uint8ClampedArray(width * height);
      for (let i = 0; i < width * height; i++) {
        mask[i] = maskBuf[i] > 0 ? 255 : 0;
      }

      // Build foreground image: premultiply RGB by alpha, set alpha from mask
      const fg = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        const alpha = mask[i / 4] / 255;
        fg[i] = data[i] * alpha;
        fg[i + 1] = data[i + 1] * alpha;
        fg[i + 2] = data[i + 2] * alpha;
        fg[i + 3] = data[i + 3] * alpha;
      }

      return {
        mask,
        fgImageData: { ...imageData, data: fg },
        method: 'mediapipe',
      };
    } catch (err) {
      console.warn('MediaPipe segmentation failed, falling back to flood-fill:', err);
    }
  }

  // Fallback: flood-fill segmentation
  return {
    ...autoSegmentImageData(imageData, fallbackTolerance),
    method: 'floodfill',
  };
}

/**
 * Check if MediaPipe segmenter is available.
 */
export function isSegmenterAvailable(): boolean {
  return segmenter !== null;
}

/**
 * Get the load error message, if any.
 */
export function getSegmenterError(): string | null {
  return loadError;
}