import { useCallback, useState } from 'react';
import { makeChromaMask, morphMask } from '@/utils/image';

export function useBackgroundEditor() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#b3d9ff'); // light blue
  const [feather, setFeather] = useState(6);
  const [threshold, setThreshold] = useState(40);
  const [transparent, setTransparent] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const process = useCallback(async (): Promise<string | null> => {
    if (!sourceUrl) return null;
    const img = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

    // Foreground mask via chroma threshold (honest fallback; not AI hair segmentation)
    const mask = makeChromaMask(imageData, transparent ? '#00ff00' : bgColor, threshold);
    const refined = morphMask(mask, img.naturalWidth, img.naturalHeight, feather > 0 ? 1 : 0);

    // Build result: composite foreground over background color (or transparent)
    const out = document.createElement('canvas');
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const octx = out.getContext('2d')!;
    if (transparent) {
      octx.clearRect(0, 0, out.width, out.height);
      // write alpha from mask
      const od = octx.createImageData(out.width, out.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const alpha = refined[(i / 4) | 0] === undefined ? 0 : refined[Math.floor(i / 4)];
        od.data[i] = imageData.data[i];
        od.data[i + 1] = imageData.data[i + 1];
        od.data[i + 2] = imageData.data[i + 2];
        od.data[i + 3] = alpha;
      }
      octx.putImageData(od, 0, 0);
    } else {
      octx.fillStyle = bgColor;
      octx.fillRect(0, 0, out.width, out.height);
      const fg = ctx.createImageData(img.naturalWidth, img.naturalHeight);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const alpha = refined[Math.floor(i / 4)];
        const a = alpha / 255;
        fg.data[i] = imageData.data[i] * a;
        fg.data[i + 1] = imageData.data[i + 1] * a;
        fg.data[i + 2] = imageData.data[i + 2] * a;
        fg.data[i + 3] = imageData.data[i + 3] * a;
      }
      octx.putImageData(fg, 0, 0);
    }

    const dataUrl = out.toDataURL('image/png');
    setResultUrl(dataUrl);
    return dataUrl;
  }, [sourceUrl, bgColor, feather, threshold, transparent]);

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
