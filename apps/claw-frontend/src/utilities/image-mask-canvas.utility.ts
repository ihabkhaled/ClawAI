import {
  MASK_BRUSH_MAX_PERCENT,
  MASK_BRUSH_MIN_PERCENT,
  MASK_FILENAME_FALLBACK,
  MASK_FILENAME_PREFIX,
  MASK_KEYBOARD_DIRECTIONS,
  MASK_KEYBOARD_FAST_MULTIPLIER,
  MASK_KEYBOARD_STEP_PERCENT,
  MASK_PAINT_ALPHA_THRESHOLD,
} from '@/constants/image-mask-editor.constants';
import type { ClientRectLike, ImagePoint, ImageSize } from '@/types/image-mask-editor.types';

const CHANNELS = 4;
const ALPHA_OFFSET = 3;
const OPAQUE = 255;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Turns the paint layer into the mask the backend expects.
 *
 * Convention (image-service `assertValidImageMask` + OpenAI `/images/edits`):
 * an RGBA PNG the SAME size as the source where a FULLY TRANSPARENT pixel
 * (alpha 0) marks the area to edit and an opaque pixel marks the area to keep.
 * The validator itself only checks PNG + alpha channel + size; the
 * transparent-means-edit meaning is the provider's (OpenAI's documented one).
 *
 * `paint` is the paint layer's RGBA bytes: alpha at or above the threshold is
 * "painted". The result is black, alpha 0 where painted and alpha 255 elsewhere.
 */
export function paintLayerToMaskPixels(
  paint: Uint8ClampedArray,
  threshold: number = MASK_PAINT_ALPHA_THRESHOLD,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(paint.length);
  for (let index = 0; index < paint.length; index += CHANNELS) {
    const painted = (paint[index + ALPHA_OFFSET] ?? 0) >= threshold;
    mask[index + ALPHA_OFFSET] = painted ? 0 : OPAQUE;
  }
  return mask;
}

/** True when at least one pixel of the paint layer is painted. */
export function hasPaintedPixels(
  paint: Uint8ClampedArray,
  threshold: number = MASK_PAINT_ALPHA_THRESHOLD,
): boolean {
  for (let index = ALPHA_OFFSET; index < paint.length; index += CHANNELS) {
    if ((paint[index] ?? 0) >= threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Maps a pointer position to the source image's pixel grid. The rectangle is
 * the canvas's physical `getBoundingClientRect()`, so a right-to-left layout
 * cannot shift the result; a point outside the canvas clamps to its edge.
 */
export function clientPointToImagePoint(
  client: { clientX: number; clientY: number },
  rect: ClientRectLike,
  size: ImageSize,
): ImagePoint {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const x = ((client.clientX - rect.left) / rect.width) * size.width;
  const y = ((client.clientY - rect.top) / rect.height) * size.height;
  return { x: clamp(x, 0, size.width), y: clamp(y, 0, size.height) };
}

/** The brush diameter in image pixels: a percent of the image's shorter side, at least 1px. */
export function brushDiameterPx(percent: number, size: ImageSize): number {
  const bounded = clamp(percent, MASK_BRUSH_MIN_PERCENT, MASK_BRUSH_MAX_PERCENT);
  return Math.max(1, Math.round((bounded / 100) * Math.min(size.width, size.height)));
}

/**
 * Moves the keyboard brush one step for an arrow key, or returns null for any
 * other key. The step is a percent of the image width, and Shift moves further.
 */
export function moveKeyboardCursor(
  cursor: ImagePoint,
  key: string,
  size: ImageSize,
  fast: boolean,
): ImagePoint | null {
  const direction = MASK_KEYBOARD_DIRECTIONS[key];
  if (direction === undefined) {
    return null;
  }
  const step =
    (MASK_KEYBOARD_STEP_PERCENT / 100) * size.width * (fast ? MASK_KEYBOARD_FAST_MULTIPLIER : 1);
  return {
    x: clamp(cursor.x + direction[0] * step, 0, size.width),
    y: clamp(cursor.y + direction[1] * step, 0, size.height),
  };
}

/** The centre of the image, where the keyboard brush starts. */
export function imageCentre(size: ImageSize): ImagePoint {
  return { x: size.width / 2, y: size.height / 2 };
}

/** The bytes a base64 string decodes to (padding excluded). */
export function base64ByteLength(base64: string): number {
  let padding = 0;
  if (base64.endsWith('==')) {
    padding = 2;
  } else if (base64.endsWith('=')) {
    padding = 1;
  }
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** The base64 payload of a `data:` URL, or '' when it is not one. */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return dataUrl.startsWith('data:') && comma >= 0 ? dataUrl.slice(comma + 1) : '';
}

/** `photo.jpg` -> `mask-photo.png`; a name with nothing usable becomes `mask-image.png`. */
export function maskFilenameFor(sourceFilename: string | undefined): string {
  const withoutExtension = (sourceFilename ?? '').replace(/\.[^./\\]+$/u, '');
  const safe = withoutExtension.replaceAll(/[^\p{L}\p{N}_-]+/gu, '-').replaceAll(/^-+|-+$/gu, '');
  return `${MASK_FILENAME_PREFIX}${safe.length > 0 ? safe : MASK_FILENAME_FALLBACK}.png`;
}
