import { describe, expect, it } from 'vitest';

import {
  base64ByteLength,
  brushDiameterPx,
  clientPointToImagePoint,
  dataUrlToBase64,
  hasPaintedPixels,
  imageCentre,
  maskFilenameFor,
  moveKeyboardCursor,
  paintLayerToMaskPixels,
} from '@/utilities/image-mask-canvas.utility';

const SIZE = { width: 200, height: 100 };

/** RGBA bytes with the given alpha per pixel. */
function layer(...alphas: number[]): Uint8ClampedArray {
  return Uint8ClampedArray.from(alphas.flatMap((alpha) => [239, 68, 68, alpha]));
}

describe('paintLayerToMaskPixels — the backend mask convention', () => {
  it('turns a painted pixel fully transparent (edit here) and an unpainted one opaque (keep)', () => {
    const mask = paintLayerToMaskPixels(layer(255, 0));

    expect(Array.from(mask)).toEqual([0, 0, 0, 0, 0, 0, 0, 255]);
  });

  it('snaps anti-aliased edges at the threshold: 127 keeps, 128 edits', () => {
    const mask = paintLayerToMaskPixels(layer(127, 128));

    expect(mask[3]).toBe(255);
    expect(mask[7]).toBe(0);
  });

  it('never leaves a half-transparent pixel', () => {
    const alphas = Array.from({ length: 256 }, (_, value) => value);
    const mask = paintLayerToMaskPixels(layer(...alphas));

    const maskAlphas = new Set(Array.from(mask).filter((_, index) => index % 4 === 3));
    expect([...maskAlphas].sort()).toEqual([0, 255]);
  });

  it('keeps the exact length so the PNG matches the source dimensions', () => {
    expect(paintLayerToMaskPixels(new Uint8ClampedArray(200 * 100 * 4))).toHaveLength(
      200 * 100 * 4,
    );
  });
});

describe('hasPaintedPixels', () => {
  it('is false for a blank layer and for faint alpha under the threshold', () => {
    expect(hasPaintedPixels(layer(0, 0, 0))).toBe(false);
    expect(hasPaintedPixels(layer(0, 127))).toBe(false);
  });

  it('is true as soon as one pixel is painted', () => {
    expect(hasPaintedPixels(layer(0, 0, 200))).toBe(true);
  });
});

describe('clientPointToImagePoint', () => {
  const rect = { left: 10, top: 20, width: 100, height: 50 };

  it('scales CSS pixels to the image grid', () => {
    expect(clientPointToImagePoint({ clientX: 60, clientY: 45 }, rect, SIZE)).toEqual({
      x: 100,
      y: 50,
    });
  });

  it('clamps a point outside the canvas to its edge', () => {
    expect(clientPointToImagePoint({ clientX: -500, clientY: 900 }, rect, SIZE)).toEqual({
      x: 0,
      y: 100,
    });
  });

  it('returns the origin for a collapsed canvas rather than dividing by zero', () => {
    expect(
      clientPointToImagePoint(
        { clientX: 5, clientY: 5 },
        { left: 0, top: 0, width: 0, height: 0 },
        SIZE,
      ),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('brushDiameterPx', () => {
  it('is a percent of the shorter side', () => {
    expect(brushDiameterPx(10, SIZE)).toBe(10);
  });

  it('clamps the percent and never drops below one pixel', () => {
    expect(brushDiameterPx(500, SIZE)).toBe(40);
    expect(brushDiameterPx(1, { width: 40, height: 40 })).toBe(1);
  });
});

describe('moveKeyboardCursor', () => {
  it('moves one step per arrow and five times as far with Shift', () => {
    const start = imageCentre(SIZE);

    expect(moveKeyboardCursor(start, 'ArrowRight', SIZE, false)).toEqual({ x: 103, y: 50 });
    expect(moveKeyboardCursor(start, 'ArrowDown', SIZE, true)).toEqual({ x: 100, y: 65 });
  });

  it('stays inside the image', () => {
    expect(moveKeyboardCursor({ x: 0, y: 0 }, 'ArrowLeft', SIZE, true)).toEqual({ x: 0, y: 0 });
  });

  it('ignores every other key', () => {
    expect(moveKeyboardCursor({ x: 1, y: 1 }, 'a', SIZE, false)).toBeNull();
  });
});

describe('data URL helpers', () => {
  it('extracts the base64 payload and refuses a non-data URL', () => {
    expect(dataUrlToBase64('data:image/png;base64,QUJD')).toBe('QUJD');
    expect(dataUrlToBase64('https://x/y.png')).toBe('');
  });

  it('counts decoded bytes, padding excluded', () => {
    expect(base64ByteLength('QUJD')).toBe(3);
    expect(base64ByteLength('QUI=')).toBe(2);
    expect(base64ByteLength('QQ==')).toBe(1);
  });
});

describe('maskFilenameFor', () => {
  it('names the mask after its source', () => {
    expect(maskFilenameFor('photo.jpg')).toBe('mask-photo.png');
  });

  it('falls back when nothing usable is left', () => {
    expect(maskFilenameFor(undefined)).toBe('mask-image.png');
    expect(maskFilenameFor('...')).toBe('mask-image.png');
  });

  it('strips path separators and spaces', () => {
    expect(maskFilenameFor('my cat/../pic.PNG')).toBe('mask-my-cat-pic.png');
  });
});
