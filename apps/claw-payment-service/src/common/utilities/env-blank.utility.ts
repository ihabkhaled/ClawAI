/**
 * Drops environment variables whose value is blank.
 *
 * A `.env` file has no way to say "absent". `PAYPAL_WEBHOOK_ID=` — which is what
 * `.env.example` ships and what every fresh install therefore has — arrives as the
 * empty string, not as `undefined`. Zod's `.optional()` only tolerates `undefined`,
 * and `.default()` only fills `undefined`, so a blank line fails `min(1)`, fails an
 * enum, or coerces to `0` and fails `positive()`.
 *
 * The effect was that leaving a gateway unconfigured — the documented, supported
 * state for local development — made the service refuse to boot.
 *
 * Normalising once, here, is deliberate: the alternative is a `.preprocess` wrapper
 * on every optional field, which is the same rule written thirty times and one
 * omission away from the same crash.
 *
 * Whitespace-only counts as blank. `PAYMOB_API_KEY=" "` is somebody clearing a
 * value, not setting one.
 */
export function withoutBlankEnvValues(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const cleaned: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
