import { z } from 'zod';

import {
  SYSTEM_SETTING_KEY_MAX_LENGTH,
  SYSTEM_SETTING_KEY_PATTERN,
  SYSTEM_SETTING_VALUE_MAX_LENGTH,
} from '../constants/system-setting.constants';

// Keys are an operator-controlled namespace (`payg.credit.enabled`). Bounded and
// character-restricted so a key can never carry a path, a wildcard, or anything
// a future cache-key builder would have to escape. Only keys under `security.`
// may use upper case, for the contract's camelCase anti-abuse keys
// (`security.turnstile.siteKey`, 2026-11-27); every other key stays lowercase.
export const systemSettingKeyParamSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(SYSTEM_SETTING_KEY_MAX_LENGTH)
    .regex(
      SYSTEM_SETTING_KEY_PATTERN,
      'key must be lowercase dot/dash/underscore separated (camelCase only under security.)',
    ),
});
export type SystemSettingKeyParamDto = z.infer<typeof systemSettingKeyParamSchema>;

// The schema allows '' so an operator can CLEAR a `security.*` setting (a
// captcha key, a domain list: empty = unset -> env or default).
// SystemSettingService.set refuses an empty value for every other key.
export const updateSystemSettingSchema = z.object({
  value: z.string().max(SYSTEM_SETTING_VALUE_MAX_LENGTH),
});
export type UpdateSystemSettingDto = z.infer<typeof updateSystemSettingSchema>;
