import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, FileText, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { usePassportStudio } from '@/hooks/usePassportStudio';
import { type PassportSettings } from '@/types';
import { exportPrintPdf } from '@/utils/pdf';
import CanvasEditor from '@/components/editor/CanvasEditor';
import type { ManualAdjustments } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/utils/image';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function PassportStudio() {
  const {
    settings, setSettings, setSource, sourceImage, sheetSize,
    facePosition, setFacePosition, renderSheet,
  } = usePassportStudio();
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [manualEdits, setManualEdits] = useState<ManualAdjustments>(DEFAULT_ADJUSTMENTS);
  const previewRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    renderSheet().then(setSheetUrl).catch((err) => {
      console.error('Passport Studio - render sheet failed:', err);
    });
  }, [settings, sourceImage, facePosition, renderSheet]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image (JPG, PNG, WEBP).');
      return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => setSource(img);
    img.src = url;
  };

  const updateSetting = (k: keyof PassportSettings, v: any) => setSettings({ ...settings, [k]: v });

  const handleExport = async (format: 'jpg' | 'png' | 'pdf') => {
    if (!sheetUrl) return;
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = sheetUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    if (format === 'pdf') {
      const jpeg = canvas.toDataURL('image/jpeg', 0.95);
      exportPrintPdf(jpeg, settings.sheetWidthIn, settings.sheetHeightIn, 'passport-sheet.pdf');
    } else {
      const a = document.createElement('a');
      a.href = canvas.toDataURL(`image/${format}`, format === 'jpg' ? 0.95 : 1);
      a.download = `passport-sheet.${format}`;
      a.click();
    }
  };

  const handlePrint = () => {
    if (!sheetUrl) return;
    const win = window.open('', '_print');
    win!.document.write(`<html><body style='margin:0'><img src='${sheetUrl}' style='width:100%'></body></html>`);
    win!.document.close();
    win!.focus();
    setTimeout(() => { win!.print(); win!.close(); }, 500);
  };

  return (
    <PageWrapper pageName="Passport Studio">
      <div className="h-full flex flex-col lg:flex-row gap-0">
      {/* Controls */}
      <div className="w-full lg:w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-[var(--color-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Passport Studio</h2>
        </div>

        <Card className="mb-4 flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              <FileText className="w-3 h-3" /> 1. Upload photograph
            </div>
          </CardHeader>
          <CardContent>
            <input
              id="passport-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('passport-upload')!.click()} className="w-full">
              Choose photo
            </Button>
            <p className="text-xs text-[var(--color-muted)] mt-2">Original is never overwritten.</p>
          </CardContent>
        </Card>

        <Card className="mb-4 flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              <RotateCw className="w-3 h-3" /> 2. Print-sheet settings
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-[var(--color-muted)]">Background colour</label>
              <div className="flex gap-2">
                {['#b3d9ff', '#ffffff', '#0000ff', '#ff0000', '#d1d5db'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateSetting('backgroundColor', c)}
                    className={`w-8 h-8 rounded-full border ${settings.backgroundColor === c ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--color-muted)]">Sheet</label>
              <div className="flex gap-2">
                <Button variant={settings.orientation === 'landscape' ? 'default' : 'outline'} size="sm" onClick={() => updateSetting('orientation', 'landscape')}>6×4 landscape</Button>
                <Button variant={settings.orientation === 'portrait' ? 'default' : 'outline'} size="sm" onClick={() => updateSetting('orientation', 'portrait')}>4×6 portrait</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--color-muted)]">Border</label>
              <Button variant={settings.border ? 'default' : 'outline'} size="sm" onClick={() => updateSetting('border', !settings.border)}>{settings.border ? 'Thin black border' : 'No border'}</Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--color-muted)]">Face position</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setFacePosition({ ...facePosition, x: Math.max(0, facePosition.x - 0.05) })}>{'<<'}</Button>
                <Button variant="outline" size="sm" onClick={() => setFacePosition({ ...facePosition, x: Math.min(1, facePosition.x + 0.05) })}>{'>>'}</Button>
                <Button variant="outline" size="sm" onClick={() => setFacePosition({ ...facePosition, y: Math.max(0, facePosition.y - 0.05) })}>^</Button>
                <Button variant="outline" size="sm" onClick={() => setFacePosition({ ...facePosition, y: Math.min(1, facePosition.y + 0.05) })}>v</Button>
              </div>
              <div className="text-[var(--color-muted)] text-xs">Drag equivalent: centre face in frame.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-neutral-50)]/40 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!sourceImage && <div className="text-[var(--color-muted)] text-sm">Upload a photograph to prepare the passport sheet</div>}
        </div>
        <div className="flex-1 overflow-auto p-8 lg:p-12 flex items-center justify-center">
          {sheetUrl ? (
            <img
              ref={previewRef}
              src={sheetUrl}
              alt="Passport print sheet"
              className="max-w-full max-h-[85vh] border border-[var(--color-border)] shadow-lg bg-white"
            />
          ) : null}
        </div>
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="text-xs text-[var(--color-muted)]">
            {sheetSize.widthPx}×{sheetSize.heightPx} px @ {sheetSize.dpi} DPI · {settings.cols}×{settings.rows} = {settings.cols*settings.rows} copies
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('jpg')} disabled={!sheetUrl}>Export JPG</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('png')} disabled={!sheetUrl}>Export PNG</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={!sheetUrl}>Export PDF</Button>
            <Button size="sm" onClick={handlePrint} disabled={!sheetUrl}>Print</Button>
          </div>
        </div>
      </div>

      {/* Manual refinement on source */}
      <div className="w-full lg:w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 text-[var(--color-accent)]"><ImageIcon /></div>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Refine source photo</h2>
        </div>
        <p className="text-xs text-[var(--color-muted)] mb-4">Adjust the source before the sheet regenerates. Identity preserved.</p>
        <CanvasEditor
          imageUrl={sourceImage ? sourceImage.src : null}
          adjustments={manualEdits}
          onAdjustmentChange={(k: keyof ManualAdjustments, v: number) => setManualEdits((p) => ({ ...p, [k]: v }))}
          onCommit={(dataUrl: string) => {
            const img = new Image(); img.onload = () => setSource(img); img.src = dataUrl;
          }}
          onUndo={() => {}} onRedo={() => {}} onReset={() => setManualEdits(DEFAULT_ADJUSTMENTS)}
          canUndo={false} canRedo={false}
        />
      </div>
    </div>
    </PageWrapper>
  );
}
