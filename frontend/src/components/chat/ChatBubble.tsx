import { RefreshCw } from 'lucide-react';
import type { Message } from '@/types';
import { Button } from '@/components/ui/Button';

interface ChatBubbleProps {
  message: Message;
  onRegenerate?: (id: string) => void;
}

export default function ChatBubble({ message, onRegenerate }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'flex-row-reverse' : ''} mb-4 gap-2`}>
      <div
        className={`
          rounded-2xl p-4 text-sm leading-relaxed shadow-sm border max-w-[85%] ${
            isUser
              ? 'bg-[var(--color-accent)] text-white border-transparent ml-auto'
              : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'
          }
        `}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.imageUrl && (
          <div className="mt-3">
            <img
              src={message.imageUrl}
              alt="Generated image"
              className="rounded-lg border border-[var(--color-border)] max-w-xs md:max-w-md shadow"
            />
          </div>
        )}
        {message.inputImageUrl && (
          <div className="mt-2 text-[var(--color-muted)] text-xs">Reference image attached</div>
        )}
      </div>
      {onRegenerate && message.role === 'assistant' && (
        <Button variant="ghost" size="sm" onClick={() => onRegenerate(message.id)} className="h-8 w-8 p-0">
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
