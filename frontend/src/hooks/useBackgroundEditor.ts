import { useCallback, useEffect, useRef, useState } from 'react';
import {
  brushStroke,
  compositeOverColor,
  createImageData,
  morphMask,
} from '@/utils/image';
import {
  isSegmenterAvailable,
  initSegmenter,
  segmentImage,
} from '@/utils/segmentation';

export function useBackgroundEditor() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#b3d9ff'); // light blue
  const [feather, setFeather] = useState(6);
  const [transparent, setTransparent] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [segmentationMethod, setSegmentationMethod] = useState<'mediapipe' | 'floodfill' | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmenterInitError, setSegmenterInitError] = useState<string | null>(null);

  // Segmentation cache: source image -> mask + fgImageData
  // Reused when only background color changes
  type SegCache = {
    sourceUrl: string;
    mask: Uint8ClampedArray;
    fgImageData: ImageData;
    width: number;
    height: number;
  };
  const segCacheRef = useRef<SegCache | null>(null);

  // Manual mask edits: array of brush strokes applied on top of base mask
  const [manualEdits, setManualEdits] = useState<Array<{
    cx: number;
    cy: number;
    radius: number;
    value: number;
    softness: number;
  }>>([]);

  // Undo/redo history for manual edits
  const [editHistory, setEditHistory] = useState<Array<Array<{
    cx: number;
    cy: number;
    radius: number;
    value: number;
    softness: number;
  }>>>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize MediaPipe segmenter on mount
  useEffect(() => {
    initSegmenter()
      .then((ready) => {
        if (!ready) {
          setSegmenterInitError(
            'AI segmentation unavailable. Using edge-based fallback (works best with subject against uniform background).'
          );
        }
      })
      .catch((err) => {
        setSegmenterInitError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const process = useCallback(async (): Promise<string | null> => {
    if (!sourceUrl) return null;
    setIsSegmenting(true);
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

      // Get segmentation mask (use cache if same source image)
      let seg = segCacheRef.current;
      if (!seg || seg.sourceUrl !== sourceUrl) {
        const result = segmentImage(imageData, 40);
        seg = {
          sourceUrl,
          mask: result.mask,
          fgImageData: result.fgImageData,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        segCacheRef.current = seg;
        setSegmentationMethod(result.method);
      }

      // Apply manual mask edits on top of base mask
      let finalMask = new Uint8ClampedArray(seg.mask);
      for (const edit of manualEdits) {
        finalMask = brushStroke(
          finalMask,
          img.naturalWidth,
          img.naturalHeight,
          edit.cx,
          edit.cy,
          edit.radius,
          edit.value,
          edit.softness
        );
      }

      // Feather the mask edge where requested
      if (feather > 0) {
        finalMask = morphMask(finalMask, img.naturalWidth, img.naturalHeight, 1);
      }

      // Build result: composite foreground over background color (or transparent)
      const out = document.createElement('canvas');
      out.width = img.naturalWidth;
      out.height = img.naturalHeight;
      const octx = out.getContext('2d')!;

      if (transparent) {
        octx.clearRect(0, 0, out.width, out.height);
        const od = octx.createImageData(out.width, out.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const a = finalMask[Math.floor(i / 4)] / 255;
          od.data[i] = imageData.data[i] * a;
          od.data[i + 1] = imageData.data[i + 1] * a;
          od.data[i + 2] = imageData.data[i + 2] * a;
          od.data[i + 3] = imageData.data[i + 3] * a;
        }
        octx.putImageData(od, 0, 0);
      } else {
        // Build foreground image from mask + original pixels
        const fg = new Uint8ClampedArray(imageData.data.length);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const alpha = finalMask[Math.floor(i / 4)] / 255;
          fg[i] = imageData.data[i] * alpha;
          fg[i + 1] = imageData.data[i + 1] * alpha;
          fg[i + 2] = imageData.data[i + 2] * alpha;
          fg[i + 3] = finalMask[Math.floor(i / 4)];
        }
        const fgImageData = createImageData(imageData.width, imageData.height, fg);
        const fgComposite = compositeOverColor(fgImageData, bgColor);
        octx.putImageData(fgComposite, 0, 0);
      }

      const dataUrl = out.toDataURL('image/png');
      setResultUrl(dataUrl);
      return dataUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setWarning(`Background processing failed: ${msg}`);
      console.error('Background processing error:', err);
      return null;
    } finally {
      setIsSegmenting(false);
    }
  }, [sourceUrl, bgColor, feather, manualEdits, transparent]);

  const applyBrush = useCallback(
    (cx: number, cy: number, radius: number, value: number, softness: number = 0) => {
      const next = [...manualEdits, { cx, cy, radius, value, softness }];
      setManualEdits(next);
      setEditHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        truncated.push(next);
        return truncated;
      });
      setHistoryIndex((i) => i + 1);
    },
    [manualEdits, historyIndex, editHistory]
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistoryIndex((i) => {
      const next = i - 1;
      setManualEdits(editHistory[next]);
      return next;
    });
  }, [canUndo, editHistory, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setHistoryIndex((i) => {
      const next = i + 1;
      setManualEdits(editHistory[next]);
      return next;
    });
  }, [canRedo, editHistory, historyIndex]);

  const resetMask = useCallback(() => {
    setManualEdits([]);
    setEditHistory([]);
    setHistoryIndex(0);
  }, []);

  const resetAll = useCallback(() => {
    setManualEdits([]);
    setResultUrl(null);
    setSegCacheRef(null);
    setEditHistory([]);
    setHistoryIndex(0);
  }, []);

  const setSegCacheRef = useCallback((val: SegCache | null) => {
    segCacheRef.current = val;
  }, []);

  return {
    sourceUrl,
    setSourceUrl,
    resultUrl,
    setResultUrl,
    bgColor,
    setBgColor,
    feather,
    setFeather,
    transparent,
    setTransparent,
    warning,
    setWarning,
    segmentationMethod,
    isSegmenting,
    segmenterInitError,
    isSegmenterAvailable: isSegmenterAvailable(),
    process,
    applyBrush,
    undo,
    redo,
    resetMask,
    resetAll,
    canUndo,
    canRedo,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
