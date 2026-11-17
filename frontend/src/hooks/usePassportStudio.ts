import { useCallback, useMemo, useRef, useState } from 'react';
import type { PassportSettings } from '@/types';
import { compositeOverColor } from '@/utils/image';
import { segmentImage } from '@/utils/segmentation';
import { api } from '@/services/api';

// Standard paper sizes (inches)
export const PAPER_SIZES: Record<string, { widthIn: number; heightIn: number; label: string }> = {
  '4x6': { widthIn: 6, heightIn: 4, label: '4 × 6 in' },
  '5x7': { widthIn: 7, heightIn: 5, label: '5 × 7 in' },
  a4: { widthIn: 11.69, heightIn: 8.27, label: 'A4' },
  a5: { widthIn: 8.27, heightIn: 5.83, label: 'A5' },
  custom: { widthIn: 6, heightIn: 4, label: 'Custom' },
};

// Standard photo sizes
export const PHOTO_SIZES: Record<string, { widthIn: number; heightIn: number; label: string }> = {
  '1.5x2': { widthIn: 1.5, heightIn: 2, label: '1.5 × 2 in' },
  '35x45mm': { widthIn: 35 / 25.4, heightIn: 45 / 25.4, label: '35 × 45 mm' },
  custom: { widthIn: 1.5, heightIn: 2, label: 'Custom' },
};

export const DEFAULT_PASSPORT_SETTINGS: PassportSettings = {
  sheetWidthIn: 6,
  sheetHeightIn: 4,
  dpi: 300,
  copies: 8,
  cols: 4,
  rows: 2,
  orientation: 'landscape',
  backgroundColor: '#b3d9ff',
  border: true,
  borderColor: '#000000',
  borderWidthPx: 2,
  gapPx: 10,
  photoWidthIn: 1.5,
  photoHeightIn: 2,
};

export interface AIState {
  status: 'idle' | 'consent-required' | 'processing' | 'success' | 'error';
  error: string | null;
  consentGiven: boolean;
  originalImageUrl: string | null;
  masterImageUrl: string | null;
}

export function usePassportStudio() {
  const [settings, setSettings] = useState<PassportSettings>(DEFAULT_PASSPORT_SETTINGS);
  const [aiState, setAiState] = useState<AIState>({
    status: 'idle',
    error: null,
    consentGiven: false,
    originalImageUrl: null,
    masterImageUrl: null,
  });

  // Segmentation cache (deterministic flood-fill only)
  const segCache = useRef<{
    sourceUrl: string;
    bgColor: string;
    rawFgImageData: ImageData;
    fgImageData: ImageData;
  } | null>(null);

  // Active image element for canvas drawing (master or original)
  const activeImgRef = useRef<HTMLImageElement | null>(null);
  const activeImgUrlRef = useRef<string | null>(null);

  // Print-sheet canvas size in pixels at DPI
  const sheetSize = useMemo(() => {
    const { orientation, sheetWidthIn, sheetHeightIn, dpi } = settings;
    const w = orientation === 'landscape' ? sheetWidthIn : sheetHeightIn;
    const h = orientation === 'landscape' ? sheetHeightIn : sheetWidthIn;
    return { widthPx: Math.round(w * dpi), heightPx: Math.round(h * dpi), dpi };
  }, [settings]);

  // Per-photo cell size (pixels) including gaps and borders
  const cell = useMemo(() => {
    const gapPx = settings.gapPx;
    const bw = settings.border ? settings.borderWidthPx : 0;
    const availW = sheetSize.widthPx - gapPx * (settings.cols + 1);
    const availH = sheetSize.heightPx - gapPx * (settings.rows + 1);
    return {
      w: Math.floor(availW / settings.cols),
      h: Math.floor(availH / settings.rows),
      bw,
    };
  }, [settings, sheetSize]);

  // Auto-calculate rows and columns that fit the copies on the paper
  const layout = useMemo(() => {
    const { copies, photoWidthIn, photoHeightIn, gapPx, borderWidthPx, border, orientation, sheetWidthIn, sheetHeightIn, dpi } = settings;
    const sheetW = orientation === 'landscape' ? sheetWidthIn : sheetHeightIn;
    const sheetH = orientation === 'landscape' ? sheetHeightIn : sheetWidthIn;

    const photoWpx = photoWidthIn * dpi;
    const photoHpx = photoHeightIn * dpi;
    const bw = border ? borderWidthPx : 0;
    const gap = gapPx;

    let maxFit = 0;
    let bestFit: { rows: number; cols: number } | null = null;
    let requestedFits = false;

    for (let cols = 1; cols <= 10; cols++) {
      for (let rows = 1; rows <= 10; rows++) {
        const availW = sheetW * dpi - gap * (cols + 1);
        const availH = sheetH * dpi - gap * (rows + 1);
        const cellW = Math.floor(availW / cols);
        const cellH = Math.floor(availH / rows);
        const pad = bw * 2 + 4;
        const innerW = cellW - pad;
        const innerH = cellH - pad;

        const fits = photoWpx <= innerW && photoHpx <= innerH;
        if (fits && cols * rows >= copies) requestedFits = true;
        if (fits && cols * rows > maxFit) {
          maxFit = cols * rows;
          bestFit = { rows, cols };
        }
      }
    }

    return { requestedFits, maxFit, bestFit };
  }, [settings]);

  // Set source image from data URL (file upload)
  const setSourceFromDataUrl = useCallback((dataUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setAiState((prev) => ({
        ...prev,
        originalImageUrl: dataUrl,
        masterImageUrl: null,
        status: 'idle',
        error: null,
        consentGiven: false,
      }));
      activeImgRef.current = img;
      activeImgUrlRef.current = dataUrl;
      // Invalidate seg cache since source changed
      segCache.current = null;
    };
    img.src = dataUrl;
  }, []);

  // AI Enhance: send original to image-edit provider
  const enhanceImage = useCallback(async (): Promise<string | null> => {
    if (!aiState.originalImageUrl) {
      setAiState((prev) => ({ ...prev, status: 'error', error: 'No original image to enhance' }));
      return null;
    }

    if (!aiState.consentGiven) {
      setAiState((prev) => ({ ...prev, status: 'consent-required' }));
      return null;
    }

    setAiState((prev) => ({ ...prev, status: 'processing', error: null }));

    try {
      const bgColor = settings.backgroundColor;
      const prompt = `Replace the existing background with the exact color ${bgColor}. Professionally improve and enhance the photograph. Improve lighting, exposure, sharpness, clarity and natural colour balance. Preserve the person's real identity, facial features, face shape, skin texture and expression. Preserve natural hair, ears, shoulders and clothing. Do not invent facial details, reshape the face, change age, alter identity or create an artificial-looking portrait. Produce one clean, realistic, passport-style head-and-shoulders photograph. Centre the face and retain both shoulders where possible.`;

      const res = await api.imageEdit({ imageUrl: aiState.originalImageUrl, prompt });
      if (!res.ok || !res.edited) {
        throw new Error(res.message || 'AI image editing returned no result');
      }

      const editedUrl = res.editedImageUrl || res.imageUrl;
      if (!editedUrl) {
        throw new Error('AI provider returned no image URL');
      }

      setAiState((prev) => ({ ...prev, status: 'success', masterImageUrl: editedUrl, error: null }));
      segCache.current = null;
      return editedUrl;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiState((prev) => ({ ...prev, status: 'error', error: msg }));
      return null;
    }
  }, [aiState.originalImageUrl, aiState.consentGiven, settings.backgroundColor]);

  // Give consent for AI processing
  const giveConsent = useCallback(() => {
    setAiState((prev) => ({ ...prev, consentGiven: true }));
  }, []);

  // Reset AI state
  const resetAI = useCallback(() => {
    setAiState((prev) => ({ ...prev, status: 'idle', error: null, masterImageUrl: null, consentGiven: false }));
    segCache.current = null;
  }, []);

  // Prepare the foreground image: segment source once, composite over bg color
  const prepareForeground = useCallback(async (): Promise<ImageData | null> => {
    const sourceUrl = aiState.masterImageUrl || aiState.originalImageUrl;
    if (!sourceUrl) return null;

    let img = activeImgRef.current;
    if (!img || activeImgUrlRef.current !== sourceUrl) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceUrl;
      activeImgRef.current = img;
      activeImgUrlRef.current = sourceUrl;
    }

    // Wait for image to load if not already loaded
    if (!img.complete || img.naturalWidth === 0) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }

    // Re-segment only when the source image changes
    if (!segCache.current || segCache.current.sourceUrl !== sourceUrl) {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = img.naturalWidth;
      tmpCanvas.height = img.naturalHeight;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(img, 0, 0);
      const imageData = tmpCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

      // Segment using deterministic flood-fill
      const { fgImageData: rawFgImageData } = segmentImage(imageData, 40);

      segCache.current = {
        sourceUrl,
        bgColor: settings.backgroundColor,
        rawFgImageData,
        fgImageData: compositeOverColor(rawFgImageData, settings.backgroundColor),
      };
    }

    // Re-composite from raw when bg color changes
    if (segCache.current.bgColor !== settings.backgroundColor) {
      segCache.current.fgImageData = compositeOverColor(
        segCache.current.rawFgImageData,
        settings.backgroundColor,
      );
      segCache.current.bgColor = settings.backgroundColor;
    }

    return segCache.current.fgImageData;
  }, [aiState.masterImageUrl, aiState.originalImageUrl, settings.backgroundColor]);

  // Render the print sheet to an offscreen canvas and return a data URL
  const renderSheet = useCallback(async (): Promise<string | null> => {
    const sourceUrl = aiState.masterImageUrl || aiState.originalImageUrl;
    if (!sourceUrl) return null;

    let img = activeImgRef.current;
    if (!img || activeImgUrlRef.current !== sourceUrl) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceUrl;
      activeImgRef.current = img;
      activeImgUrlRef.current = sourceUrl;
    }

    // Wait for image to load if not already loaded
    if (!img.complete || img.naturalWidth === 0) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }

    const { widthPx, heightPx } = sheetSize;
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d')!;

    // Fill paper background (WHITE)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const { w: cellW, h: cellH, bw } = cell;
    const gap = settings.gapPx;
    const photoAspect = settings.photoWidthIn / settings.photoHeightIn;

    // Source crop box: head-and-shoulders framing, centred
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    let cropW = srcW;
    let cropH = srcW / photoAspect;
    if (cropH > srcH) {
      cropH = srcH;
      cropW = srcH * photoAspect;
    }
    let cropX = (srcW - cropW) / 2;
    let cropY = (srcH - cropH) / 2;
    cropX = Math.max(0, Math.min(srcW - cropW, cropX));
    cropY = Math.max(0, Math.min(srcH - cropH, cropY));

    const cols = settings.cols;
    const rows = settings.rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = gap + c * (cellW + gap);
        const cy = gap + r * (cellH + gap);

        // Border
        if (settings.border && bw > 0) {
          ctx.fillStyle = settings.borderColor;
          ctx.fillRect(cx, cy, cellW, cellH);
          ctx.fillStyle = settings.backgroundColor;
          ctx.fillRect(cx + bw, cy + bw, cellW - bw * 2, cellH - bw * 2);
        }

        // Photo draw region inside cell
        const pad = bw * 2 + 4;
        const pw = cellW - pad;
        const ph = cellH - pad;
        let dw = pw;
        let dh = pw / photoAspect;
        if (dh > ph) {
          dh = ph;
          dw = ph * photoAspect;
        }
        const dx = cx + (cellW - dw) / 2;
        const dy = cy + (cellH - dh) / 2;

        ctx.drawImage(
          img,
          cropX, cropY, cropW, cropH,
          dx, dy, dw, dh,
        );
      }
    }
    return canvas.toDataURL('image/png');
  }, [aiState.masterImageUrl, aiState.originalImageUrl, settings, sheetSize, cell]);

  const updateSetting = useCallback((k: keyof PassportSettings, v: any) => {
    setSettings((prev) => ({ ...prev, [k]: v }));
  }, []);

  return {
    settings,
    setSettings,
    updateSetting,
    setSourceFromDataUrl,
    aiState,
    giveConsent,
    enhanceImage,
    resetAI,
    imageElement: activeImgRef.current,
    prepareForeground,
    renderSheet,
    sheetSize,
    cell,
    layout,
  };
}
