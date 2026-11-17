import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, FileText, Palette, RotateCw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { usePassportStudio, PAPER_SIZES, PHOTO_SIZES } from '@/hooks/usePassportStudio';
import { exportPrintPdf } from '@/utils/pdf';
import CanvasEditor from '@/components/editor/CanvasEditor';
import type { ManualAdjustments } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/utils/image';
import { PageWrapper } from '@/components/layout/PageWrapper';

const PAPER_KEYS: Array<keyof typeof PAPER_SIZES> = ['4x6', '5x7', 'a4', 'a5', 'custom'];
const PHOTO_KEYS: Array<keyof typeof PHOTO_SIZES> = ['1.5x2', '35x45mm', 'custom'];

export default function PassportStudio() {
  const {
    settings, updateSetting,
    setSourceFromDataUrl,
    aiState, giveConsent, enhanceImage, resetAI,
    renderSheet,
    sheetSize, layout,
  } = usePassportStudio();
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [manualEdits, setManualEdits] = useState<ManualAdjustments>(DEFAULT_ADJUSTMENTS);
  const [customPaperWidth, setCustomPaperWidth] = useState(settings.sheetWidthIn);
  const [customPaperHeight, setCustomPaperHeight] = useState(settings.sheetHeightIn);
  const [customPhotoWidth, setCustomPhotoWidth] = useState(settings.photoWidthIn);
  const [customPhotoHeight, setCustomPhotoHeight] = useState(settings.photoHeightIn);
  const previewRef = useRef<HTMLImageElement>(null);

  // Re-render sheet when settings or AI state change
  useEffect(() => {
    renderSheet().then(setSheetUrl).catch((err) => {
      console.error('Passport Studio - render sheet failed:', err);
    });
  }, [settings, aiState, renderSheet]);

  // Update custom fields when settings change
  useEffect(() => {
    if (settings.sheetWidthIn !== customPaperWidth) setCustomPaperWidth(settings.sheetWidthIn);
    if (settings.sheetHeightIn !== customPaperHeight) setCustomPaperHeight(settings.sheetHeightIn);
    if (settings.photoWidthIn !== customPhotoWidth) setCustomPhotoWidth(settings.photoWidthIn);
    if (settings.photoHeightIn !== customPhotoHeight) setCustomPhotoHeight(settings.photoHeightIn);
  }, [settings, customPaperWidth, customPaperHeight, customPhotoWidth, customPhotoHeight]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSourceFromDataUrl(dataUrl);
    };
    reader.readAsDataURL(f);
  };

  const handleGenerate = async () => {
    await enhanceImage();
  };

  const handleAcceptAI = () => {
    // Master image is already set; just refresh the sheet
    renderSheet().then(setSheetUrl);
  };

  const handleRegenerateAI = () => {
    enhanceImage();
  };


  const handleCancelAI = () => {
    resetAI();
    setSheetUrl(null);
  };

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

  const activeImageUrl = aiState.masterImageUrl || aiState.originalImageUrl;
  const aiUnavailable = aiState.status === 'error' && aiState.error?.includes('No configured AI provider');

  const paperKey = settings.orientation === 'landscape'
    ? (settings.sheetWidthIn === 6 && settings.sheetHeightIn === 4 ? '4x6' :
       settings.sheetWidthIn === 7 && settings.sheetHeightIn === 5 ? '5x7' :
       settings.sheetWidthIn === 11.69 ? 'a4' :
       settings.sheetWidthIn === 8.27 ? 'a5' : 'custom')
    : (settings.sheetWidthIn === 4 && settings.sheetHeightIn === 6 ? '4x6' :
       settings.sheetWidthIn === 5 && settings.sheetHeightIn === 7 ? '5x7' :
       settings.sheetWidthIn === 8.27 ? 'a4' :
       settings.sheetWidthIn === 5.83 ? 'a5' : 'custom');

  const photoKey = (settings.photoWidthIn === 1.5 && settings.photoHeightIn === 2) ? '1.5x2' :
    (Math.abs(settings.photoWidthIn - 35/25.4) < 0.01 && Math.abs(settings.photoHeightIn - 45/25.4) < 0.01) ? '35x45mm' : 'custom';

  return (
    <PageWrapper pageName="Passport Studio">
      <div className="h-full flex flex-col lg:flex-row gap-0">
        {/* Controls */}
        <div className="w-full lg:w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Passport Studio</h2>
          </div>

          {/* Step 1: Upload */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <ImageIcon className="w-3 h-3" /> 1. Upload photograph
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
              {aiState.originalImageUrl && (
                <div className="mt-3">
                  <img src={aiState.originalImageUrl} alt="Original" className="w-full h-24 object-cover rounded border border-[var(--color-border)]" />
                  <p className="text-xs text-[var(--color-muted)] mt-1">Original uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Background color */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <Palette className="w-3 h-3" /> 2. Background colour
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {['#b3d9ff', '#ffffff', '#0000ff', '#ff0000', '#006400', '#d1d5db'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateSetting('backgroundColor', c)}
                    className={`w-8 h-8 rounded-full border ${settings.backgroundColor === c ? 'ring-2 ring-[var(--color-accent)]' : ''}`} style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: AI Enhance */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <RefreshCw className="w-3 h-3" /> 3. AI Enhance
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="ai-consent"
                  type="checkbox"
                  checked={aiState.consentGiven}
                  onChange={giveConsent}
                  disabled={aiState.status === 'processing'}
                />
                <label className="text-sm text-[var(--color-text)]">I consent to send my photo to the AI provider for editing</label>
              </div>
              <p className="text-xs text-[var(--color-muted)]">AI replaces the background with your selected colour and enhances the photo. One portrait only — no grid, no print sheet.</p>
              {aiUnavailable && (
                <div className="p-2 rounded bg-amber-900/20 border border-amber-900/30 text-amber-200 text-xs">
                  AI enhancement unavailable: no configured provider supports image-to-image editing. Manual editing still works.
                </div>
              )}
              {aiState.error && !aiUnavailable && (
                <div className="p-2 rounded bg-red-900/20 border border-red-900/30 text-red-200 text-xs">
                  {aiState.error}
                </div>
              )}
              <Button
                variant={aiState.status === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={handleGenerate}
                disabled={!aiState.originalImageUrl || !aiState.consentGiven || aiState.status === 'processing' || aiUnavailable}
                className="w-full"
              >
                {aiState.status === 'processing' ? 'Generating…' : aiState.status === 'consent-required' ? 'Give consent first' : aiUnavailable ? 'AI unavailable' : 'Generate Passport Photo'}
              </Button>
              {aiState.status === 'success' && (
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAcceptAI} className="flex-1">Accept result</Button>
                  <Button variant="outline" size="sm" onClick={handleRegenerateAI} className="flex-1">Generate again</Button>
                  <Button variant="outline" size="sm" onClick={handleCancelAI} className="flex-1">Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4: Print-sheet settings */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <RotateCw className="w-3 h-3" /> 4. Print-sheet settings
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Paper size</label>
                <div className="flex gap-1">
                  {PAPER_KEYS.map((k) => (
                    <Button
                      key={k}
                      variant={paperKey === k ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const ps = PAPER_SIZES[k];
                        updateSetting('sheetWidthIn', ps.widthIn);
                        updateSetting('sheetHeightIn', ps.heightIn);
                        updateSetting('orientation', ps.widthIn > ps.heightIn ? 'landscape' : 'portrait');
                      }}
                    >
                      {PAPER_SIZES[k].label}
                    </Button>
                  ))}
                </div>
                {paperKey === 'custom' && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={customPaperWidth}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) { setCustomPaperWidth(v); updateSetting('sheetWidthIn', v); }
                      }}
                      className="w-1/2 text-xs border border-[var(--color-border)] p-1 rounded"
                      placeholder="Width in"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={customPaperHeight}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) { setCustomPaperHeight(v); updateSetting('sheetHeightIn', v); }
                      }}
                      className="w-1/2 text-xs border border-[var(--color-border)] p-1 rounded"
                      placeholder="Height in"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Photo size</label>
                <div className="flex gap-1">
                  {PHOTO_KEYS.map((k) => (
                    <Button
                      key={k}
                      variant={photoKey === k ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const ps = PHOTO_SIZES[k];
                        updateSetting('photoWidthIn', ps.widthIn);
                        updateSetting('photoHeightIn', ps.heightIn);
                      }}
                    >
                      {PHOTO_SIZES[k].label}
                    </Button>
                  ))}
                </div>
                {photoKey === 'custom' && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={customPhotoWidth}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) { setCustomPhotoWidth(v); updateSetting('photoWidthIn', v); }
                      }}
                      className="w-1/2 text-xs border border-[var(--color-border)] p-1 rounded"
                      placeholder="Width in"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={customPhotoHeight}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) { setCustomPhotoHeight(v); updateSetting('photoHeightIn', v); }
                      }}
                      className="w-1/2 text-xs border border-[var(--color-border)] p-1 rounded"
                      placeholder="Height in"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Number of copies</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={settings.copies}
                    onChange={(e) => updateSetting('copies', Number(e.target.value))}
                    className="w-full accent-[var(--color-accent)]"
                  />
                  <span className="text-xs font-mono text-[var(--color-text)]">{settings.copies}</span>
                </div>
                <p className="text-[var(--color-muted)] text-xs">
                  {layout.bestFit ? `Max ${layout.maxFit} copies fit on this paper at this photo size.` : ''}
                  {!layout.requestedFits && layout.bestFit ? `⚠ ${settings.copies} copies do not fit — reduce to ${layout.maxFit} or increase paper/photo size.` : ''}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--color-muted)]">Layout</label>
                <div className="flex gap-2">
                  <Button variant={settings.border ? 'default' : 'outline'} size="sm" onClick={() => updateSetting('border', !settings.border)}>{settings.border ? 'Border' : 'No border'}</Button>
                </div>
                <div className="flex gap-2">
                  <label className="text-xs text-[var(--color-muted)]">Gap (px)</label>
                  <input
                    type="number"
                    step="1"
                    value={settings.gapPx}
                    onChange={(e) => updateSetting('gapPx', Number(e.target.value))}
                    className="w-16 text-xs border border-[var(--color-border)] p-1 rounded"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status info */}
          <div className="mt-auto text-[var(--color-muted)] text-xs space-y-1">
            <div>{sheetSize.widthPx}×{sheetSize.heightPx} px @ {sheetSize.dpi} DPI</div>
            <div>{settings.cols}×{settings.rows} = {settings.cols * settings.rows} cells</div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-neutral-50)]/40 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setManualEdits(DEFAULT_ADJUSTMENTS)}>Reset adjustments</Button>
            </div>
          </div>

          {/* Before/After AI comparison */}
          {aiState.originalImageUrl && aiState.masterImageUrl && aiState.status === 'success' ? (
            <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mb-4">
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white">
                <div className="text-[var(--color-muted)] text-xs px-2 py-1 bg-[var(--color-neutral-100)]">Original</div>
                <img src={aiState.originalImageUrl} alt="Original" className="w-full h-auto object-contain max-h-[40vh]" />
              </div>
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white relative">
                <div className="text-[var(--color-muted)] text-xs px-2 py-1 bg-[var(--color-neutral-100)]">AI-Enhanced Master</div>
                <img src={aiState.masterImageUrl} alt="AI Enhanced" className="w-full h-auto object-contain max-h-[40vh]" />
                <div className="absolute top-2 right-2 bg-green-900/20 border border-green-900/30 text-green-200 text-xs px-2 py-1 rounded">AI Accepted</div>
              </div>
            </div>
          ) : null}

          {/* Print sheet preview */}
          <div className="flex-1 overflow-auto p-8 lg:p-12 flex items-center justify-center">
            {!activeImageUrl && <div className="text-[var(--color-muted)] text-sm">Upload a photograph to begin.</div>}
            {sheetUrl ? (
              <img
                ref={previewRef}
                src={sheetUrl}
                alt="Passport print sheet"
                className="max-w-full max-h-[85vh] border border-[var(--color-border)] shadow-lg bg-white object-contain"
              />
            ) : activeImageUrl ? (
              <img src={activeImageUrl} alt="Master portrait" className="max-w-full max-h-[70vh] border border-[var(--color-border)] rounded-lg shadow-lg bg-white object-contain" />
            ) : null}
          </div>

          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="text-xs text-[var(--color-muted)]">
              {sheetSize.widthPx}×{sheetSize.heightPx} px @ {sheetSize.dpi} DPI · {settings.cols}×{settings.rows} = {settings.cols * settings.rows} copies
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('jpg')} disabled={!sheetUrl}>Export JPG</Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('png')} disabled={!sheetUrl}>Export PNG</Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={!sheetUrl}>Export PDF</Button>
              <Button size="sm" onClick={handlePrint} disabled={!sheetUrl}>Print</Button>
            </div>
          </div>
        </div>

        {/* Manual refinement on master */}
        <div className="w-full lg:w-72 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Refine master photo</h2>
          </div>
          <p className="text-xs text-[var(--color-muted)] mb-4">Manual adjustments apply to the master portrait. All print copies update automatically.</p>
          <CanvasEditor
            imageUrl={activeImageUrl}
            adjustments={manualEdits}
            onAdjustmentChange={(k: keyof ManualAdjustments, v: number) => setManualEdits((p) => ({ ...p, [k]: v }))}
            onCommit={(dataUrl: string) => {
              const img = new Image(); img.onload = () => setSourceFromDataUrl(dataUrl); img.src = dataUrl;
            }}
            onUndo={() => {}} onRedo={() => {}} onReset={() => setManualEdits(DEFAULT_ADJUSTMENTS)}
            canUndo={false} canRedo={false}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
