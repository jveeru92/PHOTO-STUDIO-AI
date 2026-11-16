import type { Message } from '@/types';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ImageGalleryProps {
  images: Message[];
  onDownload: (url: string) => void;
}

export default function ImageGallery({ images, onDownload }: ImageGalleryProps) {
  const imgMessages = images.filter((m) => m.imageUrl);
  if (imgMessages.length === 0) return null;
  return (
    <section className="mt-6 border-t border-[var(--color-border)] pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Generated images</h3>
        <span className="text-xs text-[var(--color-muted)]">{imgMessages.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {imgMessages.map((m) => (
          <div key={m.id} className="relative group">
            <img
              src={m.imageUrl!}
              alt="Generated"
              className="w-full h-40 object-cover rounded-lg border border-[var(--color-border)]"
            />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(m.imageUrl!)}
                className="h-8 w-8 p-0 bg-white/90 backdrop-blur"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-1 text-xs text-[var(--color-muted)] truncate">{m.content.slice(0, 40)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
