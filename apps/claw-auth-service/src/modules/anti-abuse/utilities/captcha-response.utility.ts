import { CaptchaOutcome } from '../enums/captcha-outcome.enum';
import {
  recaptchaVerifyResponseSchema,
  turnstileVerifyResponseSchema,
} from '../schemas/captcha-response.schema';
import type { RecaptchaExpectation } from '../types/bot-check.types';

/** Cloudflare Turnstile: `success` decides. An unreadable body is UNREACHABLE, not a refusal. */
export function readTurnstileOutcome(body: unknown): CaptchaOutcome {
  const parsed = turnstileVerifyResponseSchema.safeParse(body);
  if (!parsed.success) {
    return CaptchaOutcome.UNREACHABLE;
  }
  return parsed.data.success ? CaptchaOutcome.PASSED : CaptchaOutcome.REJECTED;
}

/**
 * Google reCAPTCHA v3: passes only with `success`, the expected `action` (a token
 * minted for login cannot be replayed at register) and `score >= minScore`. A
 * missing score counts as 0.
 */
export function readRecaptchaOutcome(
  body: unknown,
  expectation: RecaptchaExpectation,
): CaptchaOutcome {
  const parsed = recaptchaVerifyResponseSchema.safeParse(body);
  if (!parsed.success) {
    return CaptchaOutcome.UNREACHABLE;
  }
  const { success, action, score } = parsed.data;
  const passed =
    success && action === String(expectation.action) && (score ?? 0) >= expectation.minScore;
  return passed ? CaptchaOutcome.PASSED : CaptchaOutcome.REJECTED;
}
