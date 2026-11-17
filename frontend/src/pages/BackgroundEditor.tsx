import { Image as ImageIcon, Download, Link, ZoomIn, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useBackgroundEditor } from '@/hooks/useBackgroundEditor';
import { PageWrapper } from '@/components/layout/PageWrapper';

/**
 * Background Editor — single-image viewer only.
 *
 * Displays the single AI-edited portrait produced by Passport Studio.
 * No AI processing, no segmentation, no mask editing, no background removal.
 * Just view, zoom, and download the single portrait.
 *
 * If there is no processed image yet, shows a clear message directing
 * the user to generate one in Passport Studio.
 */
export default function BackgroundEditor() {
  const {
    imageUrl,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    handleDownload,
  } = useBackgroundEditor();

  // Allow Passport Studio to pass the master image here via shared state
  // (In a production app, this would use a shared context or URL state)
  const handleOpenPassportStudio = () => {
    // Navigate to Passport Studio page
    window.location.href = '/passport';
  };

  return (
    <PageWrapper pageName="Background Editor">
      <div className="h-full flex flex-col lg:flex-row gap-0">
        {/* Controls */}
        <div className="w-full lg:w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Background Editor</h2>
          </div>

          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <ImageIcon className="w-3 h-3" /> Portrait
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {imageUrl ? (
                <>
                  <p className="text-xs text-[var(--color-muted)]">Single AI-edited portrait from Passport Studio.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={zoomOut} className="flex-1">
                      <ZoomIn className="w-4 h-4" /> Zoom out
                    </Button>
                    <Button variant="outline" size="sm" onClick={zoomIn} className="flex-1">
                      Zoom in <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetZoom} className="flex-1">Reset</Button>
                  </div>
                  <div className="text-[var(--color-muted)] text-xs">Zoom: {Math.round(zoom * 100)}%</div>
                  <Button size="sm" onClick={handleDownload} className="w-full" disabled={!imageUrl}>
                    <Download className="w-4 h-4" /> Download portrait
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenPassportStudio} className="w-full">
                    <Link className="w-4 h-4" /> Open in Passport Studio
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-[var(--color-muted)]">No processed portrait yet.</p>
                  <div className="text-[var(--color-muted)] text-xs text-center">
                    Generate an AI-edited portrait in Passport Studio first, then view it here.
                  </div>
                  <Button size="sm" onClick={handleOpenPassportStudio} className="w-full">
                    <Link className="w-4 h-4" /> Go to Passport Studio
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="mt-auto text-[var(--color-muted)] text-xs space-y-1">
            <div>Background Editor</div>
            <div>Single-image viewer</div>
            <div>No AI processing here</div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-neutral-50)]/40 p-8 lg:p-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Portrait Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!imageUrl}>
                <Download className="w-4 h-4" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenPassportStudio}>
                <Link className="w-4 h-4" /> Edit in Passport Studio
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            {!imageUrl ? (
              <div className="text-[var(--color-muted)] text-sm">
                No processed portrait yet.<br />
                Generate one in Passport Studio — it will appear here automatically.
              </div>
            ) : (
              <div
                className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white shadow-lg"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                }}
              >
                <img src={imageUrl} alt="Portrait" className="block max-w-full max-h-[80vh] object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
