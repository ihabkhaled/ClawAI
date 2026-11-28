import { z } from 'zod';

import {
  REPORT_SOURCE_PATTERN,
  REPORTABLE_SIGNAL_CODES,
  USER_ID_MAX_LENGTH,
} from '../constants/abuse-defense.constants';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';

// What another service may tell auth-service about an account whose OWN valid token did something
// abusive (ADR-233). Only the counted codes are accepted: TOKEN_REUSE and BANNED_DEVICE_SIGNIN are
// raised by auth-service itself and cannot be forged by a caller. `.strict()` refuses anything else,
// so a token, an address or a payload cannot ride along.
export const abuseSignalBodySchema = z
  .object({
    userId: z.string().min(1).max(USER_ID_MAX_LENGTH),
    code: z
      .nativeEnum(AbuseSignalCode)
      .refine(
        (code) => REPORTABLE_SIGNAL_CODES.includes(code),
        'This signal code is not reportable',
      ),
    source: z.string().regex(REPORT_SOURCE_PATTERN),
  })
  .strict();
export type AbuseSignalBodyDto = z.infer<typeof abuseSignalBodySchema>;

export const adminAbuseParamSchema = z.object({
  userId: z.string().min(1).max(USER_ID_MAX_LENGTH),
});
export type AdminAbuseParamDto = z.infer<typeof adminAbuseParamSchema>;
