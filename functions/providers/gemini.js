/**
 * Category A — Conversational AI & image understanding (Google Gemini).
 * Free-tier candidate: gemini-1.5-flash-latest (vision-capable).
 * Server-side only — API key never reaches the frontend.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function extractBase64(dataUrl) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  return match ? { mime: match[1], data: match[2] } : null;
}

async function generateContent({ model, apiKey, contents, generationConfig = {} }) {
  const url = `${API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = { contents, generationConfig };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${text}`);
  }
  return res.json();
}

function buildParts(message, attachments = []) {
  const parts = [{ text: message }];
  for (const a of attachments) {
    if (a.kind === 'image' && a.dataUrl) {
      const b64 = extractBase64(a.dataUrl);
      if (b64) parts.push({ inlineData: { mimeType: b64.mime, data: b64.data } });
    } else if (a.kind === 'document') {
      parts.push({ text: `\n[Document attached: ${a.name} (${a.type}) — text extraction not performed by this provider]` });
    }
  }
  return parts;
}

module.exports = {
  name: 'Gemini',
  category: 'chat',
  configured: !!process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',

  async interpret({ message, attachments = [], conversationHistory = [] }) {
    if (!this.configured) throw new Error('Gemini API key not configured');
    const contents = [
      ...conversationHistory.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: buildParts(message, attachments) },
    ];
    const data = await generateContent({
      model: this.model,
      apiKey: process.env.GEMINI_API_KEY,
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    });
    const text = data.candidates && data.candidates[0]
      && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map((p) => p.text || '').join('')
      : '';
    return { text };
  },
};
