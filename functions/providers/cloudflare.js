/**
 * Category B — Image generation & editing (Cloudflare Workers AI).
 *
 * Text-to-image model: @cf/black-forest-labs/flux-2-klein-4b (default)
 * Image-to-image model: @cf/stabilityai/stable-diffusion-xl-base-1.0 (default)
 *
 * Free allocation: 10,000 Neurons/day (does NOT equal 10,000 images).
 * Server-side only — API token + account ID never reach the frontend.
 */

const BASE = 'https://api.cloudflare.com/client/v4/accounts/';

module.exports = {
  name: 'Cloudflare Workers AI',
  category: 'image',
  configured: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID),
  // Text-to-image model
  model: process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b',
  // Image-to-image (editing) model
  editModel: process.env.CLOUDFLARE_IMAGE_EDIT_MODEL || '@cf/stabilityai/stable-diffusion-xl-base-1.0',

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
      if (data.result && data.result.image) return { imageBase64: data.result.image, format: 'png' };
      if (data.result && typeof data.result === 'string') return { imageBase64: data.result, format: 'png' };
      throw new Error('Cloudflare Workers AI returned no image');
    }
    const buf = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { imageBase64: base64, format: 'png' };
  },

  /**
   * Image-to-image editing. Sends an existing image plus a prompt to the
   * Workers AI image-to-image model. Returns a base64 data URL of the result.
   */
  async edit({ imageBase64, prompt }) {
    if (!this.configured) throw new Error('Cloudflare Workers AI not configured (API token + Account ID required)');
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const url = `${BASE}${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(this.editModel)}`;

    // imageBase64 may be a full data URL or raw base64
    let imageData = imageBase64;
    if (imageData.startsWith('data:')) {
      // Already a data URL — pass it through as-is
    } else {
      imageData = `data:image/png;base64,${imageData}`;
    }

    const body = {
      prompt,
      image: imageData,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudflare Workers AI edit ${res.status}: ${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      if (data.result && data.result.image) return { imageUrl: `data:image/png;base64,${data.result.image}` };
      if (data.result && typeof data.result === 'string') return { imageUrl: `data:image/png;base64,${data.result}` };
      throw new Error('Cloudflare Workers AI edit returned no image');
    }
    // Direct image response (arraybuffer)
    const buf = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { imageUrl: `data:image/png;base64,${base64}` };
  },
};
