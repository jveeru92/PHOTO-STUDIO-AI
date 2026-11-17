/**
 * Image-to-image editing endpoint.
 *
 * Uses Cloudflare Workers AI with an image-to-image model (e.g.
 * stable-diffusion-xl-base-1.0 or flux-1-kontext-dev) to edit an uploaded
 * photograph according to a prompt. Server-side only — API token + account
 * ID never reach the frontend.
 *
 * Zero-spend: uses Cloudflare Workers AI free allocation (10,000 Neurons/day).
 * Enforced via ZERO_SPEND_MODE and quota manager.
 */

const { record, canProceed } = require('../backend/quota-manager');
const Cloudflare = require('./providers/cloudflare');

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { imageUrl, prompt, conversationId } = payload;
  if (!imageUrl || !prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'imageUrl and prompt are required' }) };
  }

  if (!Cloudflare.configured) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: false,
        edited: false,
        error: 'Cloudflare Workers AI not configured. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Netlify environment variables.',
      }),
    };
  }

  const proceed = canProceed('image', 'Cloudflare Workers AI');
  if (!proceed.allowed) {
    return { statusCode: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, edited: false, error: proceed.reason || 'Quota exhausted or provider unavailable' }) };
  }

  try {
    const result = await Cloudflare.edit({ imageBase64: imageUrl, prompt });
    record('image', 'Cloudflare Workers AI', 1, 1);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        edited: true,
        editedImageUrl: result.imageUrl,
        provider: Cloudflare.name,
        model: Cloudflare.model,
      }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, edited: false, error: err.message || 'Image editing failed' }),
    };
  }
};
