/**
 * Deterministic, offline image processing used by Manual refinement,
 * Passport Studio and Background Editor. Runs in the browser Canvas API —
 * no AI, no network, no server required.
 */

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
export function clamp0255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export interface ManualAdjustments {
  brightness: number;   // 0..2, 1 = normal
  contrast: number;     // 0..2, 1 = normal
  saturation: number;   // 0..2, 1 = normal
  exposure: number;     // -2..4 stops
  temperature: number;  // -1..1
  tint: number;         // -1..1
  sharpness: number;    // 0..2
  highlights: number;   // -1..1
  shadows: number;      // -1..1
}

export const DEFAULT_ADJUSTMENTS: ManualAdjustments = {
  brightness: 1, contrast: 1, saturation: 1, exposure: 0,
  temperature: 0, tint: 0, sharpness: 1, highlights: 0, shadows: 0,
};

function boxBlurHorizontal(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const base = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = clamp(x + dx, 0, w - 1);
        const idx = (y * w + sx) * 4;
        r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
      }
      out[base] = r / count; out[base + 1] = g / count; out[base + 2] = b / count; out[base + 3] = data[base + 3];
    }
  }
  return out;
}

function boxBlurVertical(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const base = (y * w + x) * 4;
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = clamp(y + dy, 0, h - 1);
        const idx = (sy * w + x) * 4;
        r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
      }
      out[base] = r / count; out[base + 1] = g / count; out[base + 2] = b / count; out[base + 3] = data[base + 3];
    }
  }
  return out;
}

/**
 * Apply all manual adjustments in a single deterministic pass over pixel data.
 * Non-destructive: returns a new ImageData; the caller keeps the original.
 */
export function applyManualAdjustments(
  imageData: ImageData,
  a: ManualAdjustments,
): ImageData {
  const { data } = imageData;
  const w = imageData.width;
  const h = imageData.height;
  const out = new Uint8ClampedArray(data.length);

  const bright = clamp(a.brightness, 0, 2);
  const cont = clamp(a.contrast, 0, 2);
  const sat = clamp(a.saturation, 0, 2);
  const exp = Math.pow(2, clamp(a.exposure, -4, 4));
  const temp = clamp(a.temperature, -1, 1);
  const tint = clamp(a.tint, -1, 1);
  const sharp = clamp(a.sharpness, 0, 2);
  const high = clamp(a.highlights, -1, 1);
  const shad = clamp(a.shadows, -1, 1);

  // First pass: exposure, brightness, contrast, saturation, temperature, tint
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * exp;
    let g = data[i + 1] * exp;
    let b = data[i + 2] * exp;

    r += (bright - 1) * 128;
    g += (bright - 1) * 128;
    b += (bright - 1) * 128;

    r = 128 + (r - 128) * cont;
    g = 128 + (g - 128) * cont;
    b = 128 + (b - 128) * cont;

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * sat;
    g = gray + (g - gray) * sat;
    b = gray + (b - gray) * sat;

    r += temp * 48;
    b -= temp * 48;

    // tint: push green vs magenta (red+blue)
    const magenta = (r + b) / 2;
    g = g + (magenta - g) * tint * 0.6;

    out[i] = clamp0255(r);
    out[i + 1] = clamp0255(g);
    out[i + 2] = clamp0255(b);
    out[i + 3] = data[i + 3];
  }

  // Highlights / shadows tonal adjustment (luminance-based), per-pixel independent
  if (high !== 0 || shad !== 0) {
    for (let i = 0; i < out.length; i += 4) {
      const lum = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
      let factor = 1;
      if (lum > 160) factor += high * (lum - 160) / 95;
      if (lum < 100) factor += shad * (100 - lum) / 100;
      out[i] = clamp0255(out[i] * factor);
      out[i + 1] = clamp0255(out[i + 1] * factor);
      out[i + 2] = clamp0255(out[i + 2] * factor);
    }
  }

  // Sharpness via unsharp mask
  if (sharp !== 1) {
    const blur = boxBlurVertical(boxBlurHorizontal(out, w, h, 1), w, h, 1);
    const amount = sharp - 1; // 0..1
    for (let i = 0; i < out.length; i += 4) {
      out[i] = clamp0255(out[i] + amount * (out[i] - blur[i]));
      out[i + 1] = clamp0255(out[i + 1] + amount * (out[i + 1] - blur[i + 1]));
      out[i + 2] = clamp0255(out[i + 2] + amount * (out[i + 2] - blur[i + 2]));
    }
  }

  return { ...imageData, data: out };
}

/**
 * Composite a foreground image over a solid background color.
 */
export function compositeOverColor(fgImageData: ImageData, color: string): ImageData {
  const c = parseColor(color);
  const out = new Uint8ClampedArray(fgImageData.data.length);
  const data = fgImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    out[i] = clamp0255(data[i] * alpha + c.r * (1 - alpha));
    out[i + 1] = clamp0255(data[i + 1] * alpha + c.g * (1 - alpha));
    out[i + 2] = clamp0255(data[i + 2] * alpha + c.b * (1 - alpha));
    out[i + 3] = 255;
  }
  return { ...fgImageData, data: out };
}

function parseColor(css: string) {
  const m3 = css.match(/^#([0-9a-fA-F]{3})$/);
  if (m3) {
    const h = m3[1];
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
  }
  const m6 = css.match(/^#([0-9a-fA-F]{6})$/);
  if (m6) {
    const h = m6[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  const rgb = css.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  const names: Record<string, [number, number, number]> = {
    white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], lime: [0, 255, 0], blue: [0, 0, 255],
    gray: [128, 128, 128], transparent: [0, 0, 0],
  };
  if (names[css]) return { r: names[css][0], g: names[css][1], b: names[css][2] };
  return { r: 255, g: 255, b: 255 };
}

/**
 * Simple threshold-based background mask: treats pixels close to a target color
 * as background. Honest, limited — used as a fallback when AI segmentation is unavailable.
 */
export function makeChromaMask(
  imageData: ImageData,
  targetColor: string,
  threshold: number,
): Uint8ClampedArray {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const mask = new Uint8ClampedArray(w * h);
  const c = parseColor(targetColor);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dr = data[i] - c.r;
      const dg = data[i + 1] - c.g;
      const db = data[i + 2] - c.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      mask[y * w + x] = dist > threshold ? 255 : 0;
    }
  }
  return mask;
}

/**
 * Dilate/shrink a binary mask by `radius` pixels (simple morphological operator)
 * for edge refinement (feathering/contract).
 */
export function morphMask(mask: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let max = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = clamp(y + dy, 0, h - 1);
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = clamp(x + dx, 0, w - 1);
          max = Math.max(max, mask[sy * w + sx]);
        }
      }
      out[y * w + x] = max;
    }
  }
  return out;
}
