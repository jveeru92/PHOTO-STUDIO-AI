const { getProviderStatus, record, canProceed } = require('./quota-manager');
const Gemini = require('./providers/gemini');
const OpenRouter = require('./providers/openrouter');
const Cloudflare = require('./providers/cloudflare');

// in-memory conversations (per container; durable storage needs a configured DB)
const conversations = new Map();

function getConv(id) {
  if (!id || !conversations.has(id)) {
    const nid = id || 'conv-' + Date.now();
    conversations.set(nid, { id: nid, title: 'New conversation', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] });
    return conversations.get(nid);
  }
  return conversations.get(id);
}

function imageGenIntent(text) {
  const t = (text || '').toLowerCase();
  return /generate|create|make|produce|image|picture|portrait|photo of/.test(t);
}

function editIntent(text) {
  const t = (text || '').toLowerCase();
  return /change|replace|edit|modify|alter|turn.*into/.test(t);
}

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { conversationId, message, attachments = [], model } = payload;
  if (!message) return { statusCode: 400, body: JSON.stringify({ error: 'Message is required' }) };

  const conv = getConv(conversationId);
  conv.messages.push({ id: 'u-' + Date.now(), role: 'user', content: message, createdAt: new Date().toISOString(), attachments, inputImageUrl: attachments.find((a) => a.kind === 'image')?.dataUrl });
  conv.updatedAt = new Date().toISOString();

  // Try conversational AI (Gemini first, OpenRouter fallback) to interpret.
  // Zero-spend: check quota BEFORE calling any provider. Never fall back to paid.
  let assistantText = null;
  let usedProvider = null;
  for (const Provider of [Gemini, OpenRouter]) {
    if (!Provider.configured) continue;
    const proceed = canProceed('chat', Provider.name);
    if (!proceed.allowed) {
      continue;
    }
    try {
      const interp = await Provider.interpret({ message, attachments, conversationHistory: conv.messages.slice(0, -1) });
      assistantText = interp.text;
      usedProvider = Provider.name;
      record('chat', Provider.name, 1, 0);
      break;
    } catch (err) {
      continue;
    }
  }

  if (!assistantText) {
    assistantText = 'No conversational AI provider is configured. Add a Gemini or OpenRouter key in Netlify environment variables. Manual editing still works.';
  }

  // If the user wants an image, generate via Cloudflare Workers AI (Category B)
  let generatedImage = null;
  if (imageGenIntent(message) && Cloudflare.configured) {
    const proceed = canProceed('image', 'Cloudflare Workers AI');
    if (proceed.allowed) {
      try {
        const gen = await Cloudflare.generate({ prompt: message });
        generatedImage = `data:image/${gen.format || 'png'};base64,${gen.imageBase64}`;
        record('image', 'Cloudflare Workers AI', 1, 1);
      } catch (err) {
        // image gen failed; fall back to text only
      }
    } else {
      assistantText += '\n\n(Image generation skipped: free quota exhausted or provider unavailable.)';
    }
  } else if (imageGenIntent(message) && !Cloudflare.configured) {
    assistantText += '\n\n(To generate images, configure Cloudflare Workers AI token + account ID in Netlify environment variables.)';
  }

  const assistant = {
    id: 'a-' + Date.now(),
    role: 'assistant',
    content: assistantText,
    createdAt: new Date().toISOString(),
    imageUrl: generatedImage,
    inputImageUrl: attachments.find((a) => a.kind === 'image')?.dataUrl,
    provider: usedProvider,
  };
  conv.messages.push(assistant);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ conversationId: conv.id, messages: conv.messages }),
  };
};

module.exports.conversations = conversations;
