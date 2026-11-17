import { describe, it, expect } from 'vitest';
import {
  clamp,
  clamp0255,
  applyManualAdjustments,
  DEFAULT_ADJUSTMENTS,
  compositeOverColor,
  floodFillBackgroundMask,
  autoSegmentImageData,
} from './image';

function makeImageData(w: number, h: number, fill = 128): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill; data[i + 1] = fill; data[i + 2] = fill; data[i + 3] = 255;
  }
  return { width: w, height: h, data, colorSpace: 'srgb' as const };
}

function makeImageDataWithCenter(w: number, h: number, bg: number[] = [255, 255, 255], fg: number[] = [0, 0, 0]): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const cr = Math.min(w, h) / 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= cr * cr) {
        data[i] = fg[0]; data[i + 1] = fg[1]; data[i + 2] = fg[2];
      } else {
        data[i] = bg[0]; data[i + 1] = bg[1]; data[i + 2] = bg[2];
      }
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data, colorSpace: 'srgb' as const };
}

describe('clamp', () => {
  it('clamps within bounds', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('clamp0255', () => {
  it('clamps to 0-255', () => {
    expect(clamp0255(-1)).toBe(0);
    expect(clamp0255(300)).toBe(255);
    expect(clamp0255(128.7)).toBe(129);
  });
});

describe('applyManualAdjustments', () => {
  it('returns same dimensions and does not mutate input', () => {
    const id = makeImageData(10, 10, 100);
    const before = new Uint8ClampedArray(id.data);
    const out = applyManualAdjustments(id, DEFAULT_ADJUSTMENTS);
    expect(out.width).toBe(10);
    expect(out.height).toBe(10);
    expect(out.data.length).toBe(id.data.length);
    // input unchanged (defaults are identity-ish; brightness/contrast=1, saturation=1, exposure=0)
    for (let i = 0; i < before.length; i++) expect(id.data[i]).toBe(before[i]);
  });

  it('brightness increases pixel values', () => {
    const id = makeImageData(2, 2, 100);
    const out = applyManualAdjustments(id, { ...DEFAULT_ADJUSTMENTS, brightness: 1.5 });
    expect(out.data[0]).toBeGreaterThan(id.data[0]);
  });

  it('grayscale when saturation is 0', () => {
    const id = makeImageData(2, 2, 200);
    id.data[0] = 200; id.data[1] = 100; id.data[2] = 50; // colored pixel
    const out = applyManualAdjustments(id, { ...DEFAULT_ADJUSTMENTS, saturation: 0 });
    const gray = 0.299 * 200 + 0.587 * 100 + 0.114 * 50;
    expect(Math.round(out.data[0])).toBe(Math.round(gray));
    expect(Math.round(out.data[1])).toBe(Math.round(gray));
  });
});

describe('compositeOverColor', () => {
  it('composites transparent pixels over background color', () => {
    const id = makeImageData(2, 2, 0);
    // fully transparent pixel
    id.data[3] = 0;
    const out = compositeOverColor(id, '#ffffff');
    expect(out.data[0]).toBe(255);
    expect(out.data[1]).toBe(255);
    expect(out.data[2]).toBe(255);
    expect(out.data[3]).toBe(255);
  });

  it('composites semi-transparent foreground over color', () => {
    const id = makeImageData(2, 2, 100);
    // 50% alpha
    id.data[3] = 128;
    const out = compositeOverColor(id, '#ff0000'); // red background
    // out = fg * alpha + bg * (1 - alpha) = 100*0.5 + 255*0.5 = 177.5
    const expectedR = Math.round(100 * 0.5 + 255 * 0.5);
    const expectedG = Math.round(100 * 0.5 + 0 * 0.5);
    const expectedB = Math.round(100 * 0.5 + 0 * 0.5);
    expect(Math.abs(out.data[0] - expectedR)).toBeLessThanOrEqual(1);
    expect(Math.abs(out.data[1] - expectedG)).toBeLessThanOrEqual(1);
    expect(Math.abs(out.data[2] - expectedB)).toBeLessThanOrEqual(1);
    expect(out.data[3]).toBe(255);
  });
});

describe('floodFillBackgroundMask', () => {
  it('treats border pixels as background, center as foreground', () => {
    // White background with black circle in center
    const id = makeImageDataWithCenter(20, 20, [255, 255, 255], [0, 0, 0]);
    const mask = floodFillBackgroundMask(id, 40);

    // Border pixels should be background (0)
    expect(mask[0]).toBe(0); // top-left
    expect(mask[19 * 20 + 19]).toBe(0); // bottom-right
    expect(mask[0 * 20 + 10]).toBe(0); // top edge middle
    expect(mask[10 * 20 + 0]).toBe(0); // left edge middle

    // Center pixel should be foreground (255)
    const centerIdx = (10 * 20 + 10);
    expect(mask[centerIdx]).toBe(255);
  });

  it('returns all background when entire image is same color', () => {
    const id = makeImageData(10, 10, 255); // all white
    const mask = floodFillBackgroundMask(id, 40);
    for (let i = 0; i < 100; i++) {
      expect(mask[i]).toBe(0);
    }
  });

  it('uses tolerance to control segmentation strictness', () => {
    // Background is near-white (250,250,250), foreground is pure white (255,255,255)
    // With tight tolerance (10), foreground should NOT be separated from background
    // because they're too similar
    const data = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
    // Make border slightly different (250,250,250) so flood fill seeds are different from center
    for (let x = 0; x < 10; x++) {
      data[(0 * 10 + x) * 4] = 250; data[(0 * 10 + x) * 4 + 1] = 250; data[(0 * 10 + x) * 4 + 2] = 250;
      data[(9 * 10 + x) * 4] = 250; data[(9 * 10 + x) * 4 + 1] = 250; data[(9 * 10 + x) * 4 + 2] = 250;
    }
    for (let y = 0; y < 10; y++) {
      data[(y * 10 + 0) * 4] = 250; data[(y * 10 + 0) * 4 + 1] = 250; data[(y * 10 + 0) * 4 + 2] = 250;
      data[(y * 10 + 9) * 4] = 250; data[(y * 10 + 9) * 4 + 1] = 250; data[(y * 10 + 9) * 4 + 2] = 250;
    }
    const id = { width: 10, height: 10, data, colorSpace: 'srgb' as const };

    // With tight tolerance, white center should NOT be reached from off-white border
    const mask = floodFillBackgroundMask(id, 5);
    const centerIdx = 5 * 10 + 5;
    expect(mask[centerIdx]).toBe(255); // center is foreground

    // With loose tolerance, white center IS similar to off-white border, so it's background
    const mask2 = floodFillBackgroundMask(id, 10);
    expect(mask2[centerIdx]).toBe(0); // center is background
  });
});

describe('autoSegmentImageData', () => {
  it('produces foreground image with premultiplied alpha', () => {
    const id = makeImageDataWithCenter(10, 10, [255, 255, 255], [255, 0, 0]);
    const { mask, fgImageData } = autoSegmentImageData(id, 40);

    // Center pixel should be foreground (alpha=255), border should be background (alpha=0)
    const centerIdx = 5 * 10 + 5;
    expect(mask[centerIdx]).toBe(255);
    const borderIdx = 0;
    expect(mask[borderIdx]).toBe(0);

    // Foreground center pixel should have premultiplied red
    const fgBase = centerIdx * 4;
    expect(fgImageData.data[fgBase]).toBe(255);   // R = 255 * 1.0
    expect(fgImageData.data[fgBase + 1]).toBe(0);  // G = 0 * 1.0
    expect(fgImageData.data[fgBase + 2]).toBe(0);  // B = 0 * 1.0
    expect(fgImageData.data[fgBase + 3]).toBe(255); // A = 255 * 1.0

    // Border pixel should have premultiplied black (background)
    const fgBorderBase = borderIdx * 4;
    expect(fgImageData.data[fgBorderBase]).toBe(0);
    expect(fgImageData.data[fgBorderBase + 1]).toBe(0);
    expect(fgImageData.data[fgBorderBase + 2]).toBe(0);
    expect(fgImageData.data[fgBorderBase + 3]).toBe(0);
  });
});
