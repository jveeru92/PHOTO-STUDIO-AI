import { Send, Paperclip, StopCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Attachment } from '@/services/api';

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  attachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
  onAttach: (files: FileList) => void;
  sending: boolean;
  onStop: () => void;
}

export default function PromptInput({
  value,
  onChange,
  onSend,
  disabled,
  attachments,
  onRemoveAttachment,
  onAttach,
  sending,
  onStop,
}: PromptInputProps) {
  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-3">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-neutral-100)] px-2 py-1"
              >
                <img
                  src={a.kind === 'image' ? a.dataUrl : ''}
                  alt=""
                  className="w-8 h-8 rounded object-cover"
                  style={{ display: a.kind === 'image' ? 'block' : 'none' }}
                />
                {a.kind !== 'image' && (
                  <span className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-muted)] text-[10px]">📄</span>
                )}
                <span className="text-xs truncate text-[var(--color-text)] max-w-[140px]">{a.name}</span>
                <button
                  onClick={() => onRemoveAttachment(a.id)}
                  className="p-1 text-[var(--color-muted)] hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative flex gap-2">
          <label className="sr-only">Attachment</label>
          <button
            onClick={() => (document.getElementById('attach-file') as HTMLInputElement).click()}
            className="p-2 rounded text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-border)]/50"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            id="attach-file"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => onAttach(e.target.files!)}
          />
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe the image you want... (e.g. cinematic portrait at sunset)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] p-3 pl-10 focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent disabled:bg-[var(--color-neutral-100)] disabled:text-[var(--color-muted)]"
            disabled={disabled || sending}
          />
          {sending ? (
            <Button variant="destructive" size="sm" onClick={onStop} className="h-9 px-3">
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={onSend} disabled={disabled || sending || (!value.trim() && attachments.length === 0)}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
