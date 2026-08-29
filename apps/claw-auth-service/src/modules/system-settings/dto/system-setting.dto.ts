import { z } from 'zod';

import {
  SYSTEM_SETTING_KEY_MAX_LENGTH,
  SYSTEM_SETTING_VALUE_MAX_LENGTH,
} from '../constants/system-setting.constants';

// Keys are an operator-controlled namespace (`payg.credit.enabled`). Bounded and
// character-restricted so a key can never carry a path, a wildcard, or anything
// a future cache-key builder would have to escape.
export const systemSettingKeyParamSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(SYSTEM_SETTING_KEY_MAX_LENGTH)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, 'key must be lowercase dot/dash/underscore separated'),
});
export type SystemSettingKeyParamDto = z.infer<typeof systemSettingKeyParamSchema>;

export const updateSystemSettingSchema = z.object({
  value: z.string().min(1).max(SYSTEM_SETTING_VALUE_MAX_LENGTH),
});
export type UpdateSystemSettingDto = z.infer<typeof updateSystemSettingSchema>;
