import type { BotCheckAction } from '../enums/bot-check-action.enum';
import type { BotCheckOutcome } from '../enums/bot-check-outcome.enum';
import type { BotCheckReason } from '../enums/bot-check-reason.enum';

/** `GET /auth/bot-check/config`: what the client must solve before it posts. */
export type BotCheckConfigView = {
  pow: { enabled: true; difficulty: number };
  turnstile: { siteKey: string } | null;
  recaptcha: { siteKey: string; action: BotCheckAction } | null;
};

/** `POST /auth/bot-check/challenge`. */
export type PowChallengeView = {
  token: string;
  salt: string;
  difficulty: number;
  expiresAt: string;
};

/** What the signed challenge token carries. `exp` is epoch milliseconds. */
export type PowChallengePayload = {
  v: number;
  salt: string;
  difficulty: number;
  exp: number;
};

/** A token whose signature and shape checked out, or why it did not. */
export type PowTokenReading = { payload: PowChallengePayload } | { failure: BotCheckReason };

/** A client's answer to one challenge. */
export type PowSolution = {
  token: string;
  nonce: string;
};

/** The `botCheck` object of a register or login body. */
export type BotCheckInput = {
  pow?: PowSolution;
  turnstileToken?: string;
  recaptchaToken?: string;
};

/** The answer of one evaluation; `reason` is for the security event only. */
export type BotCheckVerdict = {
  outcome: BotCheckOutcome;
  reason: BotCheckReason;
};

/** One captcha provider whose site key AND secret key both resolved. */
export type CaptchaKeys = {
  siteKey: string;
  secretKey: string;
};

/** What a reCAPTCHA v3 token must carry to pass. */
export type RecaptchaExpectation = {
  action: BotCheckAction;
  minScore: number;
};
