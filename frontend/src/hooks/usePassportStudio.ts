import { useCallback, useMemo, useState } from 'react';
import type { PassportSettings } from '@/types';
import { clamp0255 } from '@/utils/image';

export const DEFAULT_PASSPORT_SETTINGS: PassportSettings = {
  sheetWidthIn: 6,
  sheetHeightIn: 4,
  dpi: 300,
  copies: 8,
  cols: 4,
  rows: 2,
  orientation: 'landscape',
  backgroundColor: '#b3d9ff', // light blue
  border: true,
  borderColor: '#000000',
  borderWidthPx: 2,
  gapPx: 10,
  photoWidthIn: 1.5,
  photoHeightIn: 2,
};

export function usePassportStudio() {
  const [settings, setSettings] = useState<PassportSettings>(DEFAULT_PASSPORT_SETTINGS);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [facePosition, setFacePosition] = useState({ x: 0.5, y: 0.45, scale: 1 }); // normalized center

  const setSource = useCallback((img: HTMLImageElement | null) => setSourceImage(img), []);

  // Print-sheet canvas size in pixels at 300 DPI
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

  // Render the print sheet to an offscreen canvas and return a data URL
  const renderSheet = useCallback(async (): Promise<string | null> => {
    if (!sourceImage) return null;
    const { widthPx, heightPx } = sheetSize;
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d')!;
    // Fill background
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, widthPx, heightPx);

    const { w: cellW, h: cellH, bw } = cell;
    const gap = settings.gapPx;
    const photoAspect = settings.photoWidthIn / settings.photoHeightIn;

    // Source crop box: head-and-shoulders framing, centred on face position
    const srcW = sourceImage.naturalWidth;
    const srcH = sourceImage.naturalHeight;
    // Crop a region whose aspect matches the photo, scaled by facePosition.scale
    let cropW = srcW;
    let cropH = srcW / photoAspect;
    if (cropH > srcH) {
      cropH = srcH;
      cropW = srcH * photoAspect;
    }
    cropW *= facePosition.scale;
    cropH *= facePosition.scale;
    let cropX = (srcW - cropW) / 2 + (facePosition.x - 0.5) * (srcW - cropW) * 0.6;
    let cropY = (srcH - cropH) / 2 + (facePosition.y - 0.5) * (srcH - cropH) * 0.6;
    cropX = clamp0255(cropX) / 255; // clamp to 0..1 roughly
    cropX = Math.max(0, Math.min(srcW - cropW, cropX));
    cropY = Math.max(0, Math.min(srcH - cropH, cropY));

    for (let r = 0; r < settings.rows; r++) {
      for (let c = 0; c < settings.cols; c++) {
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
        ctx.drawImage(sourceImage, cropX, cropY, cropW, cropH, dx, dy, dw, dh);
      }
    }
    return canvas.toDataURL('image/png');
  }, [sourceImage, settings, sheetSize, cell, facePosition]);

  return {
    settings,
    setSettings,
    setSource,
    sourceImage,
    sheetSize,
    cell,
    facePosition,
    setFacePosition,
    renderSheet,
  };
}
