import { useEffect, useRef } from 'react';
import type { Message } from '@/types';
import ChatBubble from './ChatBubble';

interface MessageListProps {
  messages: Message[];
  onRegenerate: (id: string) => void;
}

export default function MessageList({ messages, onRegenerate }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 pb-8 space-y-1"
    >
      {messages.map((m) => (
        <ChatBubble key={m.id} message={m} onRegenerate={onRegenerate} />
      ))}
    </div>
  );
}
