import { useCallback, useState } from 'react';

/**
 * Background Editor — single-image viewer only.
 *
 * Displays the single AI-edited portrait produced by Passport Studio.
 * No AI processing, no segmentation, no mask editing, no background removal.
 * Just view, zoom, and download the single portrait.
 */
export function useBackgroundEditor() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Receive the master portrait from Passport Studio (called externally)
  const setImage = useCallback((url: string | null) => {
    setImageUrl(url);
    setZoom(1);
  }, []);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'passport-portrait.png';
    a.click();
  }, [imageUrl]);

  return {
    imageUrl,
    setImage,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    handleDownload,
    hasImage: !!imageUrl,
  };
}
