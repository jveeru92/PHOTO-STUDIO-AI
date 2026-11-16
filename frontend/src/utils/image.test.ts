import { describe, it, expect } from 'vitest';
import { clamp, clamp0255, applyManualAdjustments, DEFAULT_ADJUSTMENTS, compositeOverColor } from './image';

function makeImageData(w: number, h: number, fill = 128): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill; data[i + 1] = fill; data[i + 2] = fill; data[i + 3] = 255;
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
});
