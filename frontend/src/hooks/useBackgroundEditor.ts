import { useCallback, useState } from 'react';
import {
  autoSegmentImageData,
  compositeOverColor,
  morphMask,
} from '@/utils/image';

export function useBackgroundEditor() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#b3d9ff'); // light blue
  const [feather, setFeather] = useState(6);
  const [threshold, setThreshold] = useState(40);
  const [transparent, setTransparent] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Segmentation cache: source image -> foreground ImageData (premultiplied
  // over the selected background color). Reused when only the background
  // color changes, so we don't re-segment (and thus don't further degrade
  // the original photograph) on every color swap.
  type SegCache = {
    sourceUrl: string;
    mask: Uint8ClampedArray;
    fgImageData: ImageData;
    width: number;
    height: number;
  };
  const [segCache, setSegCache] = useState<SegCache | null>(null);

  const process = useCallback(async (): Promise<string | null> => {
    if (!sourceUrl) return null;
    const img = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

    // Reuse cached segmentation when the source image hasn't changed.
    let seg = segCache;
    if (!seg || seg.sourceUrl !== sourceUrl) {
      const result = autoSegmentImageData(imageData, threshold);
      seg = {
        sourceUrl,
        mask: result.mask,
        fgImageData: result.fgImageData,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      setSegCache(seg);
    }

    // Feather the mask edge where requested
    let mask = seg.mask;
    if (feather > 0) {
      mask = morphMask(mask, img.naturalWidth, img.naturalHeight, 1);
    }

    // Build result: composite foreground over background color (or transparent)
    const out = document.createElement('canvas');
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const octx = out.getContext('2d')!;

    if (transparent) {
      octx.clearRect(0, 0, out.width, out.height);
      // Apply mask as alpha channel
      const od = octx.createImageData(out.width, out.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const a = mask[Math.floor(i / 4)] / 255;
        od.data[i] = imageData.data[i] * a;
        od.data[i + 1] = imageData.data[i + 1] * a;
        od.data[i + 2] = imageData.data[i + 2] * a;
        od.data[i + 3] = imageData.data[i + 3] * a;
      }
      octx.putImageData(od, 0, 0);
    } else {
      // Composite foreground over selected background color
      const fgComposite = compositeOverColor(seg.fgImageData, bgColor);
      octx.putImageData(fgComposite, 0, 0);
    }

    const dataUrl = out.toDataURL('image/png');
    setResultUrl(dataUrl);
    return dataUrl;
  }, [sourceUrl, bgColor, feather, threshold, segCache]);

  return {
    sourceUrl,
    setSourceUrl,
    resultUrl,
    bgColor,
    setBgColor,
    feather,
    setFeather,
    threshold,
    setThreshold,
    transparent,
    setTransparent,
    warning,
    setWarning,
    process,
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
