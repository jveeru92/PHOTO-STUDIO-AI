import { useState } from 'react';
import { Image as ImageIcon, Layers, Palette } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useBackgroundEditor } from '@/hooks/useBackgroundEditor';
import CanvasEditor from '@/components/editor/CanvasEditor';
import type { ManualAdjustments } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/utils/image';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function BackgroundEditor() {
  const {
    sourceUrl, setSourceUrl, resultUrl, bgColor, setBgColor, feather, setFeather,
    threshold, setThreshold, transparent, setTransparent, warning, process,
  } = useBackgroundEditor();
  const [manualEdits, setManualEdits] = useState<ManualAdjustments>(DEFAULT_ADJUSTMENTS);
  const [compare, setCompare] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image.');
      return;
    }
    setSourceUrl(URL.createObjectURL(f));
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

        <Card className="mb-4 flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              <ImageIcon className="w-3 h-3" /> Upload
            </div>
          </CardHeader>
          <CardContent>
            <input id="bg-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('bg-upload')!.click()} className="w-full">Choose photo</Button>
          </CardContent>
        </Card>

        <Card className="mb-4 flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              <Palette className="w-3 h-3" /> Background
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <input id="transparent" type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
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
              <input type="range" min={0} max={12} step={1} value={feather} onChange={(e) => setFeather(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
              <div className="flex justify-between text-[var(--color-muted)] text-xs"><span>Off</span><span>Strong</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--color-muted)]">Removal threshold</label>
              <input type="range" min={10} max={120} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
              <div className="flex justify-between text-[var(--color-muted)] text-xs"><span>Strict</span><span>Loose</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-auto">
          <Button size="sm" onClick={process} disabled={!sourceUrl} className="w-full">
            {warning ? 'Apply (review edges)' : 'Process'}
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-neutral-50)]/40 p-8 lg:p-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Preview</h2>
          <Button variant="outline" size="sm" onClick={() => setCompare(!compare)}>Compare</Button>
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
            {warning} Complex hair or transparent objects may not segment accurately without AI segmentation.
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => resultUrl && (() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'background.png'; a.click(); })()} disabled={!resultUrl}>Export PNG</Button>
        </div>
      </div>

      {/* Manual refinement */}
      <div className="w-full lg:w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-5 h-5 text-[var(--color-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Refine result</h2>
        </div>
        <p className="text-xs text-[var(--color-muted)] mb-4">Works offline.</p>
        <CanvasEditor
          imageUrl={resultUrl}
          adjustments={manualEdits}
          onAdjustmentChange={(k: keyof ManualAdjustments, v: number) => setManualEdits((p) => ({ ...p, [k]: v }))}
          onCommit={(dataUrl: string) => {
            // commit: treat refined result as new source for re-processing
            setSourceUrl(dataUrl);
          }}
          onUndo={() => {}} onRedo={() => {}} onReset={() => setManualEdits(DEFAULT_ADJUSTMENTS)}
          canUndo={false} canRedo={false}
        />
      </div>
    </div>
    </PageWrapper>
  );
}
