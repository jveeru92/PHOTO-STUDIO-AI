/**
 * Category B — Image generation & editing (Cloudflare Workers AI).
 * Model: @cf/black-forest-labs/flux-2-klein-4b
 * Free allocation: 10,000 Neurons/day (does NOT equal 10,000 images).
 * Server-side only — API token + account ID never reach the frontend.
 */

const BASE = 'https://api.cloudflare.com/client/v4/accounts/';

module.exports = {
  name: 'Cloudflare Workers AI',
  category: 'image',
  configured: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
  model: process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b',

  async headers() {
    return {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  },

  async generate({ prompt, aspectRatio = '1:1' }) {
    if (!this.configured) throw new Error('Cloudflare Workers AI not configured (API token + Account ID required)');
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const url = `${BASE}${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(this.model)}`;
    const body = {
      prompt,
      // Flux 2 Klein input format per Cloudflare docs
      ...(aspectRatio && { aspect_ratio: aspectRatio }),
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudflare Workers AI ${res.status}: ${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      // Cloudflare may return image directly or JSON with result image
      if (data.result && data.result.image) return { imageBase64: data.result.image, format: 'png' };
      if (data.result && typeof data.result === 'string') return { imageBase64: data.result, format: 'png' };
      throw new Error('Cloudflare Workers AI returned no image');
    }
    // Direct image response (arraybuffer)
    const buf = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { imageBase64: base64, format: 'png' };
  },

  async edit({ imageBase64, prompt }) {
    // Flux 2 Klein primarily supports text-to-image. Image-to-image via
    // Workers AI may not be supported for this model. Return a clear error
    // rather than pretending.
    throw new Error('Image-to-image editing not supported by @cf/black-forest-labs/flux-2-klein-4b on Workers AI free tier');
  },
};
