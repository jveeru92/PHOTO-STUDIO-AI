import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { Attachment } from '@/services/api';
import { api } from '@/services/api';
import MessageList from '@/components/chat/MessageList';
import PromptInput from '@/components/chat/PromptInput';
import ImageGallery from '@/components/chat/ImageGallery';
import CanvasEditor from '@/components/editor/CanvasEditor';
import type { ManualAdjustments } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/utils/image';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';

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

  // AI enhance state
  const [aiConsent, setAiConsent] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMasterImage, setAiMasterImage] = useState<string | null>(null);

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
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      alert('Please upload an image (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      setAiMasterImage(null);
      setAiStatus('idle');
      setAiError(null);
    };
    reader.readAsDataURL(f);
  };

  const handleRemoveAttachment = () => {
    setSelectedImage(null);
    setAiMasterImage(null);
    setAiStatus('idle');
    setAiError(null);
  };

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

  const activeImageUrl = aiMasterImage || selectedImage;

  const handleAiEnhance = async () => {
    if (!selectedImage) return;
    if (!aiConsent) {
      setAiStatus('idle');
      return;
    }
    setAiStatus('processing');
    setAiError(null);
    try {
      const res = await api.imageEdit({
        imageUrl: selectedImage,
        prompt: 'Professionally improve and enhance this photograph. Improve lighting, exposure, sharpness, clarity and natural colour balance. Preserve the person\'s real identity, facial features, face shape, skin texture and expression. Preserve natural hair, ears, shoulders and clothing. Do not invent facial details, reshape the face, change age, alter identity or create an artificial-looking portrait. Produce one clean, realistic, natural-looking photograph.',
      });
      if (!res.ok || !res.edited) {
        throw new Error(res.error || 'AI enhancement returned no result');
      }
      setAiMasterImage(res.editedImageUrl);
      setAiStatus('success');
      setMessages((prev) => [...prev, {
        id: 'ai-' + Date.now(), role: 'assistant', content: 'AI enhancement applied',
        createdAt: new Date().toISOString(), imageUrl: res.editedImageUrl,
      }]);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiError(msg);
      setAiStatus('error');
    }
  };

  const handleAcceptAI = () => {
    setSelectedImage(aiMasterImage);
    setAiStatus('idle');
    setAiError(null);
  };

  const handleCancelAI = () => {
    setAiMasterImage(null);
    setAiStatus('idle');
    setAiError(null);
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
            onRemoveAttachment={handleRemoveAttachment}
            onAttach={handleAttach}
            sending={sending}
            onStop={() => setSending(false)}
          />
        </div>

        {/* Refinement panel */}
        <div className="w-full lg:w-96 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6 flex flex-col">
          {/* AI Enhance */}
          <Card className="mb-4 flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                <RefreshCw className="w-3 h-3" /> AI Enhance
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="ai-consent-normal"
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => setAiConsent(e.target.checked)}
                  disabled={aiStatus === 'processing'}
                />
                <label className="text-sm text-[var(--color-text)]">I consent to send my photo to the AI provider for editing</label>
              </div>
              <p className="text-xs text-[var(--color-muted)]">AI enhances lighting, exposure, sharpness, clarity and colour balance while preserving identity.</p>
              {aiError && (
                <div className="p-2 rounded bg-red-900/20 border border-red-900/30 text-red-200 text-xs">
                  {aiError}
                </div>
              )}
              <Button
                variant={aiStatus === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={handleAiEnhance}
                disabled={!selectedImage || !aiConsent || aiStatus === 'processing'}
                className="w-full"
              >
                {aiStatus === 'processing' ? 'Enhancing…' : aiStatus === 'success' ? 'Enhanced!' : 'AI Enhance'}
              </Button>
              {aiStatus === 'success' && (
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAcceptAI} className="flex-1">Accept</Button>
                  <Button variant="outline" size="sm" onClick={handleAiEnhance} className="flex-1">Again</Button>
                  <Button variant="outline" size="sm" onClick={handleCancelAI} className="flex-1">Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual refinement */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">Manual refinement</h2>
                <span className="text-xs text-[var(--color-muted)]">Works offline</span>
              </div>
            </CardHeader>
            <CardContent>
              <CanvasEditor
                imageUrl={activeImageUrl}
                adjustments={edits}
                onAdjustmentChange={(k: keyof ManualAdjustments, v: number) => setEdits((p) => ({ ...p, [k]: v }))}
                onCommit={(dataUrl: string) => {
                  setMessages((prev) => [...prev, {
                    id: 'manual-' + Date.now(), role: 'assistant', content: 'Manual adjustment applied',
                    createdAt: new Date().toISOString(), imageUrl: dataUrl,
                  }]);
                  setSelectedImage(dataUrl);
                  setAiMasterImage(null);
                  setAiStatus('idle');
                }}
                onUndo={() => {}}
                onRedo={() => {}}
                onReset={() => setEdits(DEFAULT_ADJUSTMENTS)}
                canUndo={false}
                canRedo={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
