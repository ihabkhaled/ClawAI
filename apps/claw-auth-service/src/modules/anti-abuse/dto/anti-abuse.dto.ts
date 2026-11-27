import { z } from 'zod';

import {
  CAPTCHA_TOKEN_MAX_LENGTH,
  DEVICE_FINGERPRINT_PATTERN,
  DEVICE_ID_MAX_LENGTH,
  DEVICE_ID_PATTERN,
  DEVICE_SIGNAL_NUMBER_MAX,
  DEVICE_SIGNAL_SHORT_MAX_LENGTH,
  DEVICE_SIGNAL_TEXT_MAX_LENGTH,
  LINKED_ACCOUNTS_USER_ID_MAX_LENGTH,
  POW_NONCE_PATTERN,
  POW_TOKEN_MAX_LENGTH,
} from '../constants/anti-abuse.constants';
import { BotCheckAction } from '../enums/bot-check-action.enum';

// `botCheck` and `device` are optional IN THE SCHEMA and required by POLICY: a
// missing check is refused by the service with BOT_CHECK_REQUIRED (428), not by
// this pipe with a 400, so an old client reads the coded refusal it can act on.

export const powSolutionSchema = z
  .object({
    token: z.string().min(1).max(POW_TOKEN_MAX_LENGTH),
    nonce: z.string().max(20).regex(POW_NONCE_PATTERN),
  })
  .strict();

export const botCheckSchema = z
  .object({
    pow: powSolutionSchema.optional(),
    turnstileToken: z.string().min(1).max(CAPTCHA_TOKEN_MAX_LENGTH).optional(),
    recaptchaToken: z.string().min(1).max(CAPTCHA_TOKEN_MAX_LENGTH).optional(),
  })
  .strict();
export type BotCheckDto = z.infer<typeof botCheckSchema>;

// Signals are what the client hashed into the fingerprint. They are bounded and
// then ignored: nothing here stores them. Unknown keys are dropped, not refused,
// so a newer client that collects one more signal cannot break sign-up.
const deviceSignalsSchema = z.object({
  tz: z.string().max(DEVICE_SIGNAL_SHORT_MAX_LENGTH).optional(),
  lang: z.string().max(DEVICE_SIGNAL_SHORT_MAX_LENGTH).optional(),
  platform: z.string().max(DEVICE_SIGNAL_SHORT_MAX_LENGTH).optional(),
  screen: z.string().max(DEVICE_SIGNAL_SHORT_MAX_LENGTH).optional(),
  cores: z.number().min(0).max(DEVICE_SIGNAL_NUMBER_MAX).optional(),
  memory: z.number().min(0).max(DEVICE_SIGNAL_NUMBER_MAX).optional(),
  webgl: z.string().max(DEVICE_SIGNAL_TEXT_MAX_LENGTH).optional(),
  touch: z.boolean().optional(),
});

export const deviceSchema = z.object({
  fingerprint: z.string().trim().toLowerCase().max(64).regex(DEVICE_FINGERPRINT_PATTERN),
  deviceId: z.string().trim().max(DEVICE_ID_MAX_LENGTH).regex(DEVICE_ID_PATTERN),
  signals: deviceSignalsSchema.optional(),
});
export type DeviceDto = z.infer<typeof deviceSchema>;

/** `GET /auth/bot-check/config?action=login` names the reCAPTCHA action; register by default. */
export const botCheckConfigQuerySchema = z
  .object({ action: z.nativeEnum(BotCheckAction).optional() })
  .strict();
export type BotCheckConfigQueryDto = z.infer<typeof botCheckConfigQuerySchema>;

export const linkedAccountsParamSchema = z.object({
  userId: z.string().min(1).max(LINKED_ACCOUNTS_USER_ID_MAX_LENGTH),
});
export type LinkedAccountsParamDto = z.infer<typeof linkedAccountsParamSchema>;
