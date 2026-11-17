/**
 * Image-to-image editing endpoint.
 *
 * Inspects all configured providers to determine if any genuinely supports
 * image-to-image editing. Currently:
 *   - Cloudflare Workers AI (@cf/black-forest-labs/flux-2-klein-4b): text-to-image ONLY.
 *   - Gemini: vision-capable chat, text output only — not image editing.
 *   - OpenRouter: text-only chat — not image editing.
 *
 * No configured provider supports image-to-image editing, so we return
 * edited: false with a clear message rather than faking a result.
 */

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { imageUrl, prompt } = payload;
  if (!imageUrl || !prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'imageUrl and prompt are required' }) };
  }

  // Check if any configured provider supports image-to-image editing.
  const Cloudflare = require('./providers/cloudflare');
  const Gemini = require('./providers/gemini');
  const OpenRouter = require('./providers/openrouter');

  const providers = [Cloudflare, Gemini, OpenRouter];
  const hasImageEditor = providers.some((p) => p.configured && typeof p.edit === 'function');

  if (!hasImageEditor) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        edited: false,
        message: 'No configured AI provider supports image-to-image editing. Cloudflare Workers AI (flux-2-klein-4b) is text-to-image only; Gemini and OpenRouter are text/vision chat only. Configure a verified image-editing provider to use AI Enhance. Manual editing and print-sheet generation still work offline.',
        provider: 'none',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      ok: true,
      edited: false,
      message: 'Image-to-image editing not yet implemented for this provider.',
      provider: 'none',
    }),
  };
};
