/**
 * Category A fallback — OpenRouter free chat models.
 * NOTE: Not every OpenRouter model supports image input. Choose a verified
 * free vision-capable model if attachments are sent; otherwise text-only.
 */

const API_BASE = 'https://openrouter.ai/api/v1';

module.exports = {
  name: 'OpenRouter',
  category: 'chat',
  configured: !!process.env.OPENROUTER_API_KEY,
  model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
  supportsVision: false, // set true only for verified vision-capable free models

  async interpret({ message, attachments = [], conversationHistory = [] }) {
    if (!this.configured) throw new Error('OpenRouter API key not configured');
    const hasImage = attachments.some((a) => a.kind === 'image');
    if (hasImage && !this.supportsVision) {
      throw new Error('Selected OpenRouter model does not support image input');
    }
    const body = {
      model: this.model,
      messages: [
        ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: buildUserContent(message, attachments) },
      ],
    };
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:8888',
        'X-Title': 'Photo Studio AI',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenRouter ${res.status}: ${text}`);
    }
    const data = await res.json();
    const text = data.choices && data.choices[0] ? data.choices[0].message.content || '' : '';
    return { text };
  },
};

function buildUserContent(message, attachments) {
  if (attachments.length === 0) return message;
  const parts = [{ type: 'text', text: message }];
  for (const a of attachments) {
    if (a.kind === 'image' && a.dataUrl) {
      parts.push({ type: 'image_url', image_url: { url: a.dataUrl } });
    } else if (a.kind === 'document') {
      parts.push({ type: 'text', text: `[Document: ${a.name}]` });
    }
  }
  return parts;
}
