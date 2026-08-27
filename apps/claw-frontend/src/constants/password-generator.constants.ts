/**
 * Alphabets for the generated-password path.
 *
 * Split by character class rather than kept as one string because the backend
 * demands at least one of each — upper, lower, digit and symbol — and a uniform
 * draw over a merged alphabet produces a password missing a class often enough
 * to matter. One guaranteed pick per class, then a uniform fill, then a shuffle.
 *
 * Ambiguous glyphs are excluded on purpose. An administrator reads this password
 * aloud or retypes it from a screen at least once, and `l`/`I`/`1` and `O`/`0`
 * are where that goes wrong.
 */
export const PASSWORD_GENERATOR_UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const PASSWORD_GENERATOR_LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
export const PASSWORD_GENERATOR_DIGITS = '23456789';
export const PASSWORD_GENERATOR_SYMBOLS = '!@#$%^&*()-_=+[]{}?';

/**
 * 20 characters over the ~75-glyph alphabet above is about 124 bits of entropy.
 * Comfortably past anything an offline attack reaches, and still short enough to
 * be handled once before the forced rotation replaces it.
 */
export const PASSWORD_GENERATOR_LENGTH = 20;

/** The backend floor, mirrored so the meter and the schema agree. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** A password reaching this length is treated as strong regardless of classes. */
export const PASSWORD_STRENGTH_LONG_LENGTH = 16;
