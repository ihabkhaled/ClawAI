// image-mask-editor.constants.ts — the inpainting canvas (pack §81, UI half).

/** Brush diameter bounds, as a percent of the image's SHORTER side. */
export const MASK_BRUSH_MIN_PERCENT = 1;
export const MASK_BRUSH_MAX_PERCENT = 40;
export const MASK_BRUSH_DEFAULT_PERCENT = 8;
export const MASK_BRUSH_STEP_PERCENT = 1;

/** One arrow-key press moves the keyboard brush this percent of the image width... */
export const MASK_KEYBOARD_STEP_PERCENT = 1.5;
/** ...and this many times further with Shift held. */
export const MASK_KEYBOARD_FAST_MULTIPLIER = 5;

/**
 * The paint layer is drawn in this opaque colour and shown at reduced opacity
 * by CSS; only its alpha channel matters for the exported mask.
 */
export const MASK_PAINT_COLOR = '#ef4444';

/**
 * A paint-layer pixel at or above this alpha counts as painted. Anti-aliased
 * brush edges are snapped to a hard mask, so the PNG has only fully transparent
 * (edit here) and fully opaque (keep) pixels.
 */
export const MASK_PAINT_ALPHA_THRESHOLD = 128;

export const MASK_MIME_TYPE = 'image/png';
export const MASK_FILENAME_PREFIX = 'mask-';
export const MASK_FILENAME_FALLBACK = 'image';

/** Arrow keys the keyboard brush answers to, with their unit direction. */
export const MASK_KEYBOARD_DIRECTIONS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Keys that switch the keyboard brush between painting and just moving. */
export const MASK_KEYBOARD_TOGGLE_KEYS: readonly string[] = [' ', 'Enter'];

/** `metadata.type` of an assistant message that is a refused masked edit (chat-service). */
export const IMAGE_MASK_REFUSAL_METADATA_TYPE = 'image_mask_refusal';
export const MASK_FULL_PERCENT = 100;
