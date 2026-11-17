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
import { autoSegmentImageData, createImageData } from './image';

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

      // MediaPipe categoryMask: use the documented Mask API (getAsFloat32Array)
      // Category indices: 0 = background, 1 = foreground
      //
      // IMPORTANT: MediaPipe outputs the mask at MODEL resolution (e.g. 256x256),
      // NOT at the source image resolution. We must read the mask at its native
      // dimensions and upscale it to match the source image.
      let maskBuf: Float32Array;
      let maskW: number;
      let maskH: number;
      if (typeof categoryMask.getAsFloat32Array === 'function') {
        maskBuf = categoryMask.getAsFloat32Array();
        maskW = (categoryMask as any).width ?? width;
        maskH = (categoryMask as any).height ?? height;
      } else {
        // Fallback for environments where categoryMask is already a typed array
        maskBuf = new Float32Array((categoryMask as any).buffer);
        maskW = width;
        maskH = height;
      }

      // Draw the model-resolution mask onto a small canvas, then upscale it
      // to the source image dimensions using drawImage (bilinear filtering).
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;
      const maskCtx = maskCanvas.getContext('2d')!;
      const maskImageData = maskCtx.createImageData(maskW, maskH);
      for (let i = 0; i < maskW * maskH; i++) {
        const v = maskBuf[i] > 0 ? 255 : 0;
        maskImageData.data[i * 4] = v;
        maskImageData.data[i * 4 + 1] = v;
        maskImageData.data[i * 4 + 2] = v;
        maskImageData.data[i * 4 + 3] = 255;
      }
      maskCtx.putImageData(maskImageData, 0, 0);

      const upscaledMask = new Uint8ClampedArray(width * height);
      const upscaleCanvas = document.createElement('canvas');
      upscaleCanvas.width = width;
      upscaleCanvas.height = height;
      const upscaleCtx = upscaleCanvas.getContext('2d')!;
      upscaleCtx.drawImage(maskCanvas, 0, 0, maskW, maskH, 0, 0, width, height);
      const upscaledData = upscaleCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < width * height; i++) {
        upscaledMask[i] = upscaledData[i * 4] > 127 ? 255 : 0;
      }

      const mask = upscaledMask;

      // Build foreground image: premultiply RGB by alpha, set alpha from mask
      const fg = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        const alpha = mask[i / 4] / 255;
        fg[i] = data[i] * alpha;
        fg[i + 1] = data[i + 1] * alpha;
        fg[i + 2] = data[i + 2] * alpha;
        fg[i + 3] = mask[i / 4]; // Store mask alpha directly (0-255)
      }

      return {
        mask,
        fgImageData: createImageData(width, height, fg),
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