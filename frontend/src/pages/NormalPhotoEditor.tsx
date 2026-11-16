import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import type { Attachment } from '@/services/api';
import { api } from '@/services/api';
import MessageList from '@/components/chat/MessageList';
import PromptInput from '@/components/chat/PromptInput';
import ImageGallery from '@/components/chat/ImageGallery';
import CanvasEditor from '@/components/editor/CanvasEditor';
import type { ManualAdjustments } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/utils/image';
import { PageWrapper } from '@/components/layout/PageWrapper';

export default function NormalPhotoEditor() {
  const { project } = useParams<{ project?: string }>();
  const [conversationId, setConversationId] = useState<string | undefined>(project);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [edits, setEdits] = useState<ManualAdjustments>(DEFAULT_ADJUSTMENTS);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Load conversation
  useEffect(() => {
    if (!conversationId) return;
    api.conversation(conversationId).then((data: any) => {
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      const img = data.messages.findLast((m: any) => m.imageUrl);
      setSelectedImage(img ? img.imageUrl : null);
    }).catch(() => {});
  }, [conversationId]);

  const handleAttach = (files: FileList) => {
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`${f.name} is too large (max 10 MB).`);
        continue;
      }
      const kind = f.type.startsWith('image/') ? 'image' : 'document';
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev.filter((a) => a.id !== f.name),
          { id: f.name, name: f.name, type: f.type, size: f.size, dataUrl: reader.result as string, kind },
        ]);
      };
      if (kind === 'image') reader.readAsDataURL(f);
      else next.push({ id: f.name, name: f.name, type: f.type, size: f.size, dataUrl: '', kind });
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    const content = input.trim();
    setSending(true);
    const tempId = 'temp-' + Date.now();
    const optimistic: any = {
      id: tempId, role: 'user', content, createdAt: new Date().toISOString(),
      attachments,
      inputImageUrl: attachments.find((a) => a.kind === 'image')?.dataUrl || undefined,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setAttachments([]);
    try {
      const res: any = await api.sendMessage({
        conversationId,
        message: content,
        attachments,
      });
      setConversationId(res.conversationId ?? conversationId);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessages((prev) => [...prev, ...(res.messages || [res])]);
      const last = (res.messages || [res]).at(-1);
      if (last?.imageUrl) setSelectedImage(last.imageUrl);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: 'err-' + Date.now(), role: 'assistant', content: err.message || 'AI request failed. Manual editing still works.',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;
    setInput(msg.content);
    setAttachments(msg.attachments || []);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    handleSend();
  };

  const handleDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-studio-ai-image.png';
    a.click();
  };

  return (
    <PageWrapper pageName="Normal Photo Editor">
      <div className="h-full flex flex-col lg:flex-row gap-0">
        {/* Conversation area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] lg:border-r-0">
          <div className="flex-1 overflow-y-auto border-b border-[var(--color-border)] lg:border-b-0 p-4 lg:p-6" ref={scrollRef}>
            <MessageList messages={messages} onRegenerate={handleRegenerate} />
            <ImageGallery images={messages} onDownload={handleDownload} />
          </div>
          <PromptInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={sending}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            onAttach={handleAttach}
            sending={sending}
            onStop={() => setSending(false)}
          />
        </div>

        {/* Refinement panel */}
        <div className="w-full lg:w-96 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Manual refinement</h2>
            <span className="text-xs text-[var(--color-muted)]">Works offline</span>
          </div>
          <Card className="flex-1">
            <CanvasEditor
              imageUrl={selectedImage}
              adjustments={edits}
              onAdjustmentChange={(k: keyof ManualAdjustments, v: number) => setEdits((p) => ({ ...p, [k]: v }))}
              onCommit={(dataUrl: string) => {
                setMessages((prev) => [...prev, {
                  id: 'manual-' + Date.now(), role: 'assistant', content: 'Manual adjustment applied',
                  createdAt: new Date().toISOString(), imageUrl: dataUrl,
                }]);
                setSelectedImage(dataUrl);
              }}
              onUndo={() => {}}
              onRedo={() => {}}
              onReset={() => setEdits(DEFAULT_ADJUSTMENTS)}
              canUndo={false}
              canRedo={false}
            />
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
