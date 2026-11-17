import { useEffect, useState } from 'react';
import {
  Image as ImageIcon,
  Layers,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useBackgroundEditor } from '@/hooks/useBackgroundEditor';
import { PageWrapper } from '@/components/layout/PageWrapper';

/**
 * Background Editor
 *
 * Workflow:
 *   Upload → Automatic segmentation → Background replacement → Manual mask refinement
 *   → Preview → Export
 *
 * Uses MediaPipe Image Segmenter (browser-based, zero-spend) with flood-fill fallback.
 * Supports manual mask editing via KEEP SUBJECT / REMOVE BACKGROUND brushes.
 */
export default function BackgroundEditor() {
  const {
    sourceUrl,
    setSourceUrl,
    resultUrl,
    bgColor,
    setBgColor,
    feather,
    setFeather,
    transparent,
    setTransparent,
    warning,
    isSegmenting,
    process,
    resetMask,
    resetAll,
  } = useBackgroundEditor();

  // Mask editor state
  const [isMaskEditing, setIsMaskEditing] = useState(false);
  const [brushSizePx, setBrushSizePx] = useState(25);
  const [brushHardness, setBrushHardness] = useState(0.8);
  const [brushMode, setBrushMode] = useState<'keep' | 'remove'>('keep');
  const [compare, setCompare] = useState(false);

  // Canvas refs for mask editing
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image.');
      return;
    }
    setSourceUrl(URL.createObjectURL(f));
    setIsMaskEditing(false);
  };

  // Re-process when background color changes during mask editing
  useEffect(() => {
    if (isMaskEditing && sourceUrl && resultUrl) {
      void process();
    }
  }, [bgColor, sourceUrl, resultUrl, process, isMaskEditing]);

  const handleProcess = async () => {
    await process();
  };

  const handleExport = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'background.png';
    a.click();
  };

  return (
    <PageWrapper pageName="Background Editor">
      <div className="h-full flex flex-col lg:flex-row gap-0">
        {/* Controls */}
        <div className="w-full lg:w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Background Editor</h2>
          </div>

          {/* Upload */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <ImageIcon className="w-3 h-3" /> Upload
              </div>
            </CardHeader>
            <CardContent>
              <input
                id="bg-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('bg-upload')!.click()} className="w-full">
                Choose photo
              </Button>
              <p className="text-xs text-[var(--color-muted)] mt-2">Original is never overwritten.</p>
            </CardContent>
          </Card>

          {/* Background selection */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <Palette className="w-3 h-3" /> Background
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="transparent"
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                />
                <label className="text-sm text-[var(--color-text)]">Transparent background</label>
              </div>
              {!transparent && (
                <div className="flex gap-2">
                  {['#b3d9ff', '#ffffff', '#0000ff', '#ff0000', '#006400', '#d1d5db'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      className={`w-8 h-8 rounded-full border ${bgColor === c ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Edge feather (refinement)</label>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={feather}
                  onChange={(e) => setFeather(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-[var(--color-muted)] text-xs"><span>Off</span><span>Strong</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Process button */}
          <div className="mt-auto">
            <Button
              size="sm"
              onClick={handleProcess}
              disabled={!sourceUrl || isSegmenting}
              className="w-full"
            >
              {isSegmenting ? 'Processing…' : warning ? 'Apply (review edges)' : 'Process'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-neutral-50)]/40 p-8 lg:p-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsMaskEditing((v) => !v)}>
                {isMaskEditing ? 'Done editing' : 'Edit mask'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCompare(!compare)}>Compare</Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            {compare && sourceUrl && resultUrl ? (
              <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
                <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white">
                  <div className="text-[var(--color-muted)] text-xs px-2 py-1 bg-[var(--color-neutral-100)]">Original</div>
                  <img src={sourceUrl} alt="Original" className="w-full h-auto object-contain max-h-[60vh]" />
                </div>
                <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white relative">
                  <div className="text-[var(--color-muted)] text-xs px-2 py-1 bg-[var(--color-neutral-100)]">Result</div>
                  <img src={resultUrl} alt="Result" className="w-full h-auto object-contain max-h-[60vh]" />
                  {transparent && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] opacity-30 rounded-lg"></div>}
                </div>
              </div>
            ) : resultUrl ? (
              <img src={resultUrl} alt="Result" className="max-w-full max-h-[70vh] border border-[var(--color-border)] rounded-lg shadow-lg bg-white object-contain" />
            ) : sourceUrl ? (
              <img src={sourceUrl} alt="Source" className="max-w-full max-h-[70vh] border border-[var(--color-border)] rounded-lg shadow-lg bg-white object-contain" />
            ) : (
              <div className="text-[var(--color-muted)] text-sm">Upload a photo and choose a background.</div>
            )}
          </div>
          {warning && (
            <div className="mt-3 p-3 rounded bg-amber-900/20 border border-amber-900/30 text-amber-200 text-xs">
              {warning}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleExport} disabled={!resultUrl}>Export PNG</Button>
          </div>
        </div>

        {/* Manual refinement */}
        <div className="w-full lg:w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Manual refinement</h2>
          </div>
          <p className="text-xs text-[var(--color-muted)] mb-4">Works offline. Paint to refine segmentation.</p>
          <Card className="flex-1">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[var(--color-muted)]">Brush mode</label>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={brushMode === 'keep' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBrushMode('keep')}
                    className="flex-1"
                  >
                    Keep subject
                  </Button>
                  <Button
                    variant={brushMode === 'remove' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBrushMode('remove')}
                    className="flex-1"
                  >
                    Remove bg
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Brush size</label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={brushSizePx}
                  onChange={(e) => setBrushSizePx(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-[var(--color-muted)] text-xs"><span>Small</span><span>Large</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Brush hardness</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={brushHardness}
                  onChange={(e) => setBrushHardness(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-[var(--color-muted)] text-xs"><span>Soft</span><span>Hard</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetMask}>Reset mask</Button>
                <Button variant="destructive" size="sm" onClick={resetAll}>Reset all</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}