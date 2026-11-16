const { record, canProceed } = require('../backend/quota-manager');
const Cloudflare = require('./providers/cloudflare');

module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  const { prompt, aspectRatio = '1:1' } = payload;
  if (!prompt) return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };

  if (!Cloudflare.configured) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cloudflare Workers AI not configured. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.' }) };
  }
  const proceed = canProceed('image', 'Cloudflare Workers AI');
  if (!proceed.allowed) {
    return { statusCode: 403, body: JSON.stringify({ error: proceed.reason || 'Quota exhausted or provider unavailable' }) };
  }

  try {
    const gen = await Cloudflare.generate({ prompt, aspectRatio });
    record('image', 'Cloudflare Workers AI', 1, 1);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ imageUrl: `data:image/${gen.format || 'png'};base64,${gen.imageBase64}`, provider: Cloudflare.name, model: Cloudflare.model }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: err.message || 'Image generation failed' }) };
  }
};
