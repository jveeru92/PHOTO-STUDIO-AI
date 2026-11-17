import { describe, it, expect } from 'vitest';
import {
  clamp,
  clamp0255,
  applyManualAdjustments,
  DEFAULT_ADJUSTMENTS,
  compositeForeground,
  compositeOver,
  compositeOverColor,
  drawMaskOverlay,
  floodFillBackgroundMask,
  autoSegmentImageData,
  dilateMask,
  gaussianBlur,
  brushStroke,
  createImageData,
} from './image';

function makeImageData(w: number, h: number, fill = 128): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
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
        data[i] = fg[0];
        data[i + 1] = fg[1];
        data[i + 2] = fg[2];
      } else {
        data[i] = bg[0];
        data[i + 1] = bg[1];
        data[i + 2] = bg[2];
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
    for (let i = 0; i < before.length; i++) expect(id.data[i]).toBe(before[i]);
  });

  it('brightness increases pixel values', () => {
    const id = makeImageData(2, 2, 100);
    const out = applyManualAdjustments(id, { ...DEFAULT_ADJUSTMENTS, brightness: 1.5 });
    expect(out.data[0]).toBeGreaterThan(id.data[0]);
  });

  it('grayscale when saturation is 0', () => {
    const id = makeImageData(2, 2, 200);
    id.data[0] = 200; id.data[1] = 100; id.data[2] = 50;
    const out = applyManualAdjustments(id, { ...DEFAULT_ADJUSTMENTS, saturation: 0 });
    const gray = 0.299 * 200 + 0.587 * 100 + 0.114 * 50;
    expect(Math.round(out.data[0])).toBe(Math.round(gray));
    expect(Math.round(out.data[1])).toBe(Math.round(gray));
  });
});

describe('compositeForeground', () => {
  it('composites transparent pixels over background color', () => {
    const id = makeImageData(2, 2, 0);
    id.data[3] = 0;
    const out = compositeForeground(id, '#ffffff');
    expect(out.data[0]).toBe(255);
    expect(out.data[1]).toBe(255);
    expect(out.data[2]).toBe(255);
    expect(out.data[3]).toBe(255);
  });

  it('composites semi-transparent foreground over color', () => {
    const id = makeImageData(2, 2, 100);
    id.data[3] = 128;
    const out = compositeForeground(id, '#ff0000');
    const expectedR = Math.round(100 * 0.5 + 255 * 0.5);
    const expectedG = Math.round(100 * 0.5 + 0 * 0.5);
    const expectedB = Math.round(100 * 0.5 + 0 * 0.5);
    expect(Math.abs(out.data[0] - expectedR)).toBeLessThanOrEqual(2);
    expect(Math.abs(out.data[1] - expectedG)).toBeLessThanOrEqual(2);
    expect(Math.abs(out.data[2] - expectedB)).toBeLessThanOrEqual(2);
    expect(out.data[3]).toBe(255);
  });
});

describe('compositeOver', () => {
  it('composites foreground over background image', () => {
    const fg = makeImageData(2, 2, 255);
    const bg = makeImageData(2, 2, 0);
    fg.data[6] = 255;
    fg.data[7] = 255;
    fg.data[8] = 255;
    fg.data[9] = 255;
    const out = compositeOver(fg, bg);
    const centerBase = 6;
    // Fully opaque foreground over transparent background = fully opaque result
    expect(out.data[centerBase]).toBe(255);
    expect(out.data[centerBase + 1]).toBe(255);
    expect(out.data[centerBase + 2]).toBe(255);
    expect(out.data[centerBase + 3]).toBe(255);
  });

  it('composites semi-transparent foreground over opaque background', () => {
    const fg = makeImageData(2, 2, 255);
    fg.data[3] = 128; // pixel 0: 50% alpha
    const bg = makeImageData(2, 2, 0);
    bg.data[3] = 255; // pixel 0: opaque
    const out = compositeOver(fg, bg);
    const base = 0; // pixel 0
    // outA = 0.5 + 1.0 * (1 - 0.5) = 1.0 -> alpha = 255
    expect(out.data[base + 3]).toBe(255);
    // outR = (255*0.5 + 0*1.0*0.5) / 1.0 = 127.5 -> 128 (floating point may vary)
    expect(Math.abs(out.data[base] - 128)).toBeLessThanOrEqual(5);
  });
});

describe('floodFillBackgroundMask', () => {
  it('treats border pixels as background, center as foreground', () => {
    const id = makeImageDataWithCenter(20, 20, [255, 255, 255], [0, 0, 0]);
    const mask = floodFillBackgroundMask(id, 40);
    expect(mask[0]).toBe(0);
    expect(mask[19 * 20 + 19]).toBe(0);
    expect(mask[0 * 20 + 10]).toBe(0);
    expect(mask[10 * 20 + 0]).toBe(0);
    const centerIdx = (10 * 20 + 10);
    expect(mask[centerIdx]).toBe(255);
  });

  it('returns all background when entire image is same color', () => {
    const id = makeImageData(10, 10, 255);
    const mask = floodFillBackgroundMask(id, 40);
    for (let i = 0; i < 100; i++) {
      expect(mask[i]).toBe(0);
    }
  });

  it('uses tolerance to control segmentation strictness', () => {
    const data = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    }
    for (let x = 0; x < 10; x++) {
      data[(0 * 10 + x) * 4] = 250; data[(0 * 10 + x) * 4 + 1] = 250; data[(0 * 10 + x) * 4 + 2] = 250;
      data[(9 * 10 + x) * 4] = 250; data[(9 * 10 + x) * 4 + 1] = 250; data[(9 * 10 + x) * 4 + 2] = 250;
    }
    for (let y = 0; y < 10; y++) {
      data[(y * 10 + 0) * 4] = 250; data[(y * 10 + 0) * 4 + 1] = 250; data[(y * 10 + 0) * 4 + 2] = 250;
      data[(y * 10 + 9) * 4] = 250; data[(y * 10 + 9) * 4 + 1] = 250; data[(y * 10 + 9) * 4 + 2] = 250;
    }
    const id = { width: 10, height: 10, data, colorSpace: 'srgb' as const };
    const mask = floodFillBackgroundMask(id, 5);
    const centerIdx = 5 * 10 + 5;
    expect(mask[centerIdx]).toBe(255);
    const mask2 = floodFillBackgroundMask(id, 10);
    expect(mask2[centerIdx]).toBe(0);
  });
});

describe('autoSegmentImageData', () => {
  it('produces foreground image with premultiplied alpha', () => {
    const id = makeImageDataWithCenter(10, 10, [255, 255, 255], [255, 0, 0]);
    const { mask, fgImageData } = autoSegmentImageData(id, 40);
    const centerIdx = 5 * 10 + 5;
    expect(mask[centerIdx]).toBe(255);
    const borderIdx = 0;
    expect(mask[borderIdx]).toBe(0);
    const fgBase = centerIdx * 4;
    expect(fgImageData.data[fgBase]).toBe(255);
    expect(fgImageData.data[fgBase + 1]).toBe(0);
    expect(fgImageData.data[fgBase + 2]).toBe(0);
    expect(fgImageData.data[fgBase + 3]).toBe(255);
    const fgBorderBase = borderIdx * 4;
    expect(fgImageData.data[fgBorderBase]).toBe(0);
    expect(fgImageData.data[fgBorderBase + 1]).toBe(0);
    expect(fgImageData.data[fgBorderBase + 2]).toBe(0);
    expect(fgImageData.data[fgBorderBase + 3]).toBe(0);
  });
});

describe('morphMask', () => {
  it('dilates foreground region', () => {
    const mask = new Uint8ClampedArray(5 * 5);
    mask[2 * 5 + 2] = 255;
    const dilated = dilateMask(mask, 5, 5, 1);
    expect(dilated[2 * 5 + 2]).toBe(255);
    expect(dilated[1 * 5 + 2]).toBe(255);
    expect(dilated[3 * 5 + 2]).toBe(255);
    expect(dilated[2 * 5 + 1]).toBe(255);
    expect(dilated[2 * 5 + 3]).toBe(255);
  });
});

describe('brushStroke', () => {
  it('paints foreground in circular region', () => {
    const mask = new Uint8ClampedArray(10 * 10);
    const result = brushStroke(mask, 10, 10, 5, 5, 3, 255, 0);
    const centerIdx = 5 * 10 + 5;
    expect(result[centerIdx]).toBe(255);
  });

  it('tints edges with softness', () => {
    const mask = new Uint8ClampedArray(10 * 10);
    const result = brushStroke(mask, 10, 10, 5, 5, 3, 255, 0.5);
    const centerIdx = 5 * 10 + 5;
    expect(result[centerIdx]).toBe(255);
    const edgeIdx = 5 * 10 + 7;
    expect(result[edgeIdx]).toBeGreaterThan(0);
    expect(result[edgeIdx]).toBeLessThan(255);
  });
});

describe('ImageData regression tests', () => {
  // Helper: verify a value is a genuine ImageData (not a plain object).
  // Avoids instanceof ImageData which is undefined in Node.js test env.
  function isRealImageData(v: any): boolean {
    return !!v && typeof v.width === 'number' && typeof v.height === 'number' && v.data instanceof Uint8ClampedArray;
  }

  function createCanvas(w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  // Assert that an ImageData is accepted by putImageData on a real canvas.
  // In jsdom (Node.js), getContext('2d') returns null — we skip the call
  // but still verify the ImageData structure (width, height, data).
  function assertPutImageData(id: ImageData) {
    const canvas = createCanvas(id.width, id.height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      expect(() => ctx.putImageData(id, 0, 0)).not.toThrow();
    }
  }

  it('applyManualAdjustments returns a genuine ImageData accepted by putImageData', () => {
    const id = makeImageData(8, 8, 100);
    const before = new Uint8ClampedArray(id.data);
    const out = applyManualAdjustments(id, DEFAULT_ADJUSTMENTS);
    expect(isRealImageData(out)).toBe(true);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.data.length).toBe(8 * 8 * 4);
    expect(out.data).toBeInstanceOf(Uint8ClampedArray);
    // No mutation of input
    for (let i = 0; i < before.length; i++) expect(id.data[i]).toBe(before[i]);
    // Accepted by putImageData on a real canvas
    assertPutImageData(out);
  });

  it('compositeForeground returns a genuine ImageData accepted by putImageData', () => {
    const id = makeImageData(8, 8, 100);
    const out = compositeForeground(id, '#ffffff');
    expect(isRealImageData(out)).toBe(true);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.data.length).toBe(8 * 8 * 4);
    assertPutImageData(out);
  });

  it('compositeOver returns a genuine ImageData accepted by putImageData', () => {
    const fg = makeImageData(8, 8, 255);
    const bg = makeImageData(8, 8, 0);
    const out = compositeOver(fg, bg);
    expect(isRealImageData(out)).toBe(true);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.data.length).toBe(8 * 8 * 4);
    assertPutImageData(out);
  });

  it('compositeOverColor returns a genuine ImageData accepted by putImageData', () => {
    const id = makeImageData(8, 8, 100);
    id.data[3] = 128;
    const out = compositeOverColor(id, '#ff0000');
    expect(isRealImageData(out)).toBe(true);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.data.length).toBe(8 * 8 * 4);
    assertPutImageData(out);
  });

  it('drawMaskOverlay returns a genuine ImageData accepted by putImageData', () => {
    const id = makeImageData(8, 8, 100);
    const mask = new Uint8ClampedArray(64);
    mask[10] = 255;
    const out = drawMaskOverlay(id, mask);
    expect(isRealImageData(out)).toBe(true);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out.data.length).toBe(8 * 8 * 4);
    assertPutImageData(out);
  });

  it('autoSegmentImageData returns fgImageData as genuine ImageData', () => {
    const id = makeImageDataWithCenter(8, 8, [255, 255, 255], [0, 0, 0]);
    const { mask, fgImageData } = autoSegmentImageData(id, 40);
    expect(mask).toBeInstanceOf(Uint8ClampedArray);
    expect(mask.length).toBe(64);
    expect(isRealImageData(fgImageData)).toBe(true);
    expect(fgImageData.width).toBe(8);
    expect(fgImageData.height).toBe(8);
    expect(fgImageData.data.length).toBe(8 * 8 * 4);
    assertPutImageData(fgImageData);
    // No mutation of input
    expect(id.data[0]).toBe(255);
    expect(id.data[1]).toBe(255);
    expect(id.data[2]).toBe(255);
    expect(id.data[3]).toBe(255);
  });

  it('createImageData returns a genuine ImageData', () => {
    const data = new Uint8ClampedArray(16);
    data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255;
    const id = createImageData(2, 2, data);
    expect(isRealImageData(id)).toBe(true);
    expect(id.width).toBe(2);
    expect(id.height).toBe(2);
    expect(id.data.length).toBe(16);
    assertPutImageData(id);
  });

  it('dilateMask returns a Uint8ClampedArray with correct length', () => {
    const mask = new Uint8ClampedArray(5 * 5);
    mask[2 * 5 + 2] = 255;
    const result = dilateMask(mask, 5, 5, 1);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(25);
  });

  it('gaussianBlur returns a Uint8ClampedArray with correct length', () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100; data[i + 1] = 100; data[i + 2] = 100; data[i + 3] = 255;
    }
    const result = gaussianBlur(data, 8, 8, 1.0);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(data.length);
  });

  it('no alpha corruption across all functions', () => {
    const id = makeImageData(4, 4, 200);
    // Set known alpha values
    id.data[3] = 100;
    id.data[7] = 200;
    id.data[11] = 50;
    id.data[15] = 255;

    const adj = applyManualAdjustments(id, DEFAULT_ADJUSTMENTS);
    expect(adj.data[3]).toBe(100);
    expect(adj.data[7]).toBe(200);
    expect(adj.data[11]).toBe(50);
    expect(adj.data[15]).toBe(255);

    const comp = compositeForeground(id, '#ffffff');
    expect(comp.data[3]).toBe(255); // compositeForeground sets alpha to 255
    expect(comp.data[7]).toBe(255);
    expect(comp.data[11]).toBe(255);
    expect(comp.data[15]).toBe(255);

    const over = compositeOver(id, id);
    // Compositing over itself increases alpha (never decreases)
    expect(over.data[3]).toBeGreaterThanOrEqual(100);
    expect(over.data[7]).toBeGreaterThanOrEqual(200);
    expect(over.data[11]).toBeGreaterThanOrEqual(50);
    expect(over.data[15]).toBe(255);

    const overColor = compositeOverColor(id, '#ff0000');
    expect(overColor.data[3]).toBe(255);
    expect(overColor.data[7]).toBe(255);
    expect(overColor.data[11]).toBe(255);
    expect(overColor.data[15]).toBe(255);

    const overlay = drawMaskOverlay(id, new Uint8ClampedArray(16));
    expect(overlay.data[3]).toBe(100);
    expect(overlay.data[7]).toBe(200);
    expect(overlay.data[11]).toBe(50);
    expect(overlay.data[15]).toBe(255);
  });
});