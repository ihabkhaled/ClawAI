/**
 * The smallest reply worth producing.
 *
 * Under this the request is refused rather than clamped. A clamp of three
 * tokens returns a fragment that reads like a bug, and the user has spent the
 * last of their allowance to receive it — a refusal is both cheaper and
 * honest.
 */
export const MIN_USEFUL_OUTPUT_TOKENS = 64;
