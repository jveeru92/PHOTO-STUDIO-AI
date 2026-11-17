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

/**
 * Create an ImageData-compatible object. In the browser this is a genuine
 * ImageData instance (required by putImageData). In Node.js test environments
 * it falls back to a plain object so unit tests can run without a canvas.
 */
export function createImageData(width: number, height: number, data: Uint8ClampedArray): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(data, width, height);
  }
  return { width, height, data, colorSpace: 'srgb' } as unknown as ImageData;
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
  brightness: 1,
  contrast: 1,
  saturation: 1,
  exposure: 0,
  temperature: 0,
  tint: 0,
  sharpness: 1,
  highlights: 0,
  shadows: 0,
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
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
      out[base] = r / count;
      out[base + 1] = g / count;
      out[base + 2] = b / count;
      out[base + 3] = data[base + 3];
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
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
      out[base] = r / count;
      out[base + 1] = g / count;
      out[base + 2] = b / count;
      out[base + 3] = data[base + 3];
    }
  }
  return out;
}

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

    const magenta = (r + b) / 2;
    g = g + (magenta - g) * tint * 0.6;

    out[i] = clamp0255(r);
    out[i + 1] = clamp0255(g);
    out[i + 2] = clamp0255(b);
    out[i + 3] = data[i + 3];
  }

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

  if (sharp !== 1) {
    const blur = boxBlurVertical(boxBlurHorizontal(out, w, h, 1), w, h, 1);
    const amount = sharp - 1;
    for (let i = 0; i < out.length; i += 4) {
      out[i] = clamp0255(out[i] + amount * (out[i] - blur[i]));
      out[i + 1] = clamp0255(out[i + 1] + amount * (out[i + 1] - blur[i + 1]));
      out[i + 2] = clamp0255(out[i + 2] + amount * (out[i + 2] - blur[i + 2]));
    }
  }

  return createImageData(imageData.width, imageData.height, out);
}

export function compositeForeground(fgImageData: ImageData, color: string): ImageData {
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
  return createImageData(fgImageData.width, fgImageData.height, out);
}

export function compositeOver(fg: ImageData, bg: ImageData): ImageData {
  const out = new Uint8ClampedArray(fg.data.length);
  for (let i = 0; i < fg.data.length; i += 4) {
    const fa = fg.data[i + 3] / 255;
    const ba = bg.data[i + 3] / 255;
    const outA = fa + ba * (1 - fa);
    if (outA > 0) {
      out[i] = clamp0255((fg.data[i] * fa + bg.data[i] * ba * (1 - fa)) / outA);
      out[i + 1] = clamp0255((fg.data[i + 1] * fa + bg.data[i + 1] * ba * (1 - fa)) / outA);
      out[i + 2] = clamp0255((fg.data[i + 2] * fa + bg.data[i + 2] * ba * (1 - fa)) / outA);
      out[i + 3] = clamp0255(outA * 255);
    } else {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
    }
  }
  return createImageData(fg.width, fg.height, out);
}

export function drawMaskOverlay(imageData: ImageData, mask: Uint8ClampedArray, alpha = 0.3): ImageData {
  const out = new Uint8ClampedArray(imageData.data.length);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const m = mask[i / 4] / 255;
    if (m > 0) {
      out[i] = clamp0255(imageData.data[i] * (1 - m * alpha) + 255 * m * alpha);
      out[i + 1] = imageData.data[i + 1] * (1 - m * alpha);
      out[i + 2] = imageData.data[i + 2] * (1 - m * alpha);
      out[i + 3] = imageData.data[i + 3];
    } else {
      out[i] = imageData.data[i];
      out[i + 1] = imageData.data[i + 1];
      out[i + 2] = imageData.data[i + 2];
      out[i + 3] = imageData.data[i + 3];
    }
  }
  return createImageData(imageData.width, imageData.height, out);
}

export function brushStroke(
  mask: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  softness: number = 0,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask);
  const r2 = radius * radius;
  const yStart = Math.max(0, cy - radius);
  const yEnd = Math.min(h - 1, cy + radius);
  const xStart = Math.max(0, cx - radius);
  const xEnd = Math.min(w - 1, cx + radius);
  for (let y = yStart; y <= yEnd; y++) {
    for (let x = xStart; x <= xEnd; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const dist = Math.sqrt(d2);
      let m = value;
      if (softness > 0 && dist > radius * (1 - softness)) {
        const featherDist = (dist - radius * (1 - softness)) / (radius * softness);
        const feather = Math.max(0, 1 - featherDist);
        m = value * feather;
      }
      const idx = y * w + x;
      if (value > 0) {
        out[idx] = Math.max(out[idx], m);
      } else {
        out[idx] = Math.min(out[idx], m);
      }
    }
  }
  return out;
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
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [255, 0, 0],
    lime: [0, 255, 0],
    blue: [0, 0, 255],
    gray: [128, 128, 128],
    transparent: [0, 0, 0],
  };
  if (names[css]) return { r: names[css][0], g: names[css][1], b: names[css][2] };
  return { r: 255, g: 255, b: 255 };
}

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

export function floodFillBackgroundMask(
  imageData: ImageData,
  tolerance: number,
): Uint8ClampedArray {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const total = w * h;

  const mask = new Uint8ClampedArray(total);
  const visited = new Uint8ClampedArray(total);
  const queue: number[] = [];

  const enqueue = (x: number, y: number) => {
    const idx = y * w + x;
    if (x < 0 || x >= w || y < 0 || y >= h || visited[idx]) return;
    visited[idx] = 1;
    mask[idx] = 0;
    queue.push(idx);
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  const dirs = [-1, 1, -w, w];
  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const x = idx % w;
    const base = idx * 4;
    const r1 = data[base];
    const g1 = data[base + 1];
    const b1 = data[base + 2];

    for (const d of dirs) {
      const nIdx = idx + d;
      if (d === -1 && x === 0) continue;
      if (d === 1 && x === w - 1) continue;
      if (nIdx < 0 || nIdx >= total || visited[nIdx]) continue;

      const nBase = nIdx * 4;
      const dr = data[nBase] - r1;
      const dg = data[nBase + 1] - g1;
      const db = data[nBase + 2] - b1;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= tolerance) {
        visited[nIdx] = 1;
        mask[nIdx] = 0;
        queue.push(nIdx);
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (!visited[i]) mask[i] = 255;
  }

  return mask;
}

export function autoSegmentImageData(
  imageData: ImageData,
  tolerance: number,
): { mask: Uint8ClampedArray; fgImageData: ImageData } {
  const data = imageData.data;
  const mask = floodFillBackgroundMask(imageData, tolerance);

  const fg = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = mask[i / 4] / 255;
    fg[i] = data[i] * alpha;
    fg[i + 1] = data[i + 1] * alpha;
    fg[i + 2] = data[i + 2] * alpha;
    fg[i + 3] = mask[i / 4];
  }

  return {
    mask,
    fgImageData: createImageData(imageData.width, imageData.height, fg),
  };
}

/**
 * Dilate/shrink a binary mask by `radius` pixels (simple morphological operator)
 * for edge refinement (feathering/contract).
 */
export function dilateMask(mask: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let anyForeground = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = clamp(y + dy, 0, h - 1);
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = clamp(x + dx, 0, w - 1);
          if (mask[sy * w + sx] > 0) {
            anyForeground = 255;
            break;
          }
        }
      }
      out[y * w + x] = anyForeground;
    }
  }
  return out;
}

/**
 * Composite a foreground image over a solid background color.
 * Returns a new ImageData with alpha = 255 everywhere.
 */
export function compositeOverColor(fgImageData: ImageData, color: string): ImageData {
  const c = parseColor(color);
  const out = new Uint8ClampedArray(fgImageData.data.length);
  const data = fgImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    out[i] = clamp0255(data[i] + c.r * (1 - alpha));
    out[i + 1] = clamp0255(data[i + 1] + c.g * (1 - alpha));
    out[i + 2] = clamp0255(data[i + 2] + c.b * (1 - alpha));
    out[i + 3] = 255;
  }
  return createImageData(fgImageData.width, fgImageData.height, out);
}

/**
 * Gaussian blur with separable kernel. Used for mask edge refinement.
 * `sigma` controls the blur strength.
 */
export function gaussianBlur(data: Uint8ClampedArray, w: number, h: number, sigma: number): Uint8ClampedArray {
  const kernelSize = Math.max(1, Math.floor(sigma * 3) * 2 + 1);
  const radius = Math.floor(kernelSize / 2);
  const kernel = new Float64Array(kernelSize);
  const twoSigmaSq = 2 * sigma * sigma;
  const sum = kernel.reduce((acc, _, i) => {
    const d = i - radius;
    kernel[i] = Math.exp(-(d * d) / twoSigmaSq);
    return acc + kernel[i];
  }, 0);
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  const temp = new Uint8ClampedArray(data.length);
  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, wSum = 0;
      for (let i = 0; i < kernelSize; i++) {
        const dx = i - radius;
        const sx = clamp(x + dx, 0, w - 1);
        const idx = (y * w + sx) * 4;
        const k = kernel[i];
        r += data[idx] * k;
        g += data[idx + 1] * k;
        b += data[idx + 2] * k;
        a += data[idx + 3] * k;
        wSum += k;
      }
      const idx = (y * w + x) * 4;
      temp[idx] = r / wSum;
      temp[idx + 1] = g / wSum;
      temp[idx + 2] = b / wSum;
      temp[idx + 3] = a / wSum;
    }
  }
  // Vertical pass
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, wSum = 0;
      for (let i = 0; i < kernelSize; i++) {
        const dy = i - radius;
        const sy = clamp(y + dy, 0, h - 1);
        const idx = (sy * w + x) * 4;
        const k = kernel[i];
        r += temp[idx] * k;
        g += temp[idx + 1] * k;
        b += temp[idx + 2] * k;
        a += temp[idx + 3] * k;
        wSum += k;
      }
      const idx = (y * w + x) * 4;
      out[idx] = r / wSum;
      out[idx + 1] = g / wSum;
      out[idx + 2] = b / wSum;
      out[idx + 3] = a / wSum;
    }
  }
  return out;
}