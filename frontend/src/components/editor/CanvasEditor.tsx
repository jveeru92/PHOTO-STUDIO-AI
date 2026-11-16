import { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import {
  applyManualAdjustments,
  type ManualAdjustments,
  DEFAULT_ADJUSTMENTS,
} from '@/utils/image';

interface CanvasEditorProps {
  imageUrl: string | null;
  adjustments: ManualAdjustments;
  onAdjustmentChange: (k: keyof ManualAdjustments, v: number) => void;
  onCommit: (dataUrl: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
}

const controls: Array<{ key: keyof ManualAdjustments; label: string; min: number; max: number; step: number }> = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 2, step: 0.05 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 2, step: 0.05 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.05 },
  { key: 'exposure', label: 'Exposure', min: -4, max: 4, step: 0.25 },
  { key: 'temperature', label: 'Temperature', min: -1, max: 1, step: 0.05 },
  { key: 'tint', label: 'Tint', min: -1, max: 1, step: 0.05 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 2, step: 0.05 },
  { key: 'highlights', label: 'Highlights', min: -1, max: 1, step: 0.05 },
  { key: 'shadows', label: 'Shadows', min: -1, max: 1, step: 0.05 },
];

export default function CanvasEditor({
  imageUrl,
  adjustments,
  onAdjustmentChange,
  onCommit,
  onUndo,
  onRedo,
  onReset,
  canUndo,
  canRedo,
  className,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const renderPreview = useCallback(() => {
    if (!imageUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    if (!imgRef.current) {
      imgRef.current = new Image();
      imgRef.current.crossOrigin = 'anonymous';
      imgRef.current.onload = () => {
        canvas.width = imgRef.current!.naturalWidth;
        canvas.height = imgRef.current!.naturalHeight;
        draw();
      };
      imgRef.current.src = imageUrl;
      return;
    }
    draw();

    function draw() {
      const img = imgRef.current!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      const adjusted = applyManualAdjustments(imageData, adjustments);
      ctx.putImageData(adjusted, 0, 0);
      setPreview(canvas.toDataURL('image/png'));
    }
  }, [imageUrl, adjustments]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const handleCommit = () => {
    if (preview) onCommit(preview);
  };

  return (
    <div className={className}>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-[320px]">
          <div className="image-frame rounded-xl p-1 relative aspect-[4/3] bg-[var(--color-neutral-200)]">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-contain block" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-muted)] text-sm">No image</div>
            )}
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button onClick={handleCommit} variant="default" size="sm" disabled={!preview}>
              Commit version
            </Button>
            <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo}>
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo}>
              Redo
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>Reset</Button>
          </div>
        </div>

        <div className="w-full lg:w-72 space-y-3">
          <div className="text-sm font-semibold text-[var(--color-text)] mb-2">Manual refinement</div>
          <p className="text-xs text-[var(--color-muted)] mb-4">Live preview · works offline · non-destructive</p>
          <div className="space-y-3">
            {controls.map((c) => {
              const cur = adjustments[c.key];
              const isDefault = cur === DEFAULT_ADJUSTMENTS[c.key];
              return (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text)]">{c.label}</span>
                    <span className="text-[var(--color-muted)]">{cur.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={cur}
                    onChange={(v) => onAdjustmentChange(c.key, v)}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    className={!isDefault ? 'accent-[var(--color-accent)]' : ''}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
