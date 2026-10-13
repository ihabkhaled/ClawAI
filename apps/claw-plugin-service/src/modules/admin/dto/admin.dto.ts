import { z } from 'zod';

import { TOOL_NAME_PATTERN } from '../../catalog/constants/catalog.constants';
import {
  ADMIN_SETTINGS_MAX_KEYS,
  ADMIN_TOOL_CHANGES_MAX,
} from '../constants/admin-settings.constants';

export const updateAdminCatalogBodySchema = z
  .strictObject({
    globallyEnabled: z.boolean().optional(),
    featured: z.boolean().optional(),
    tools: z
      .array(
        z.strictObject({
          name: z.string().regex(TOOL_NAME_PATTERN),
          disabledByAdmin: z.boolean(),
        }),
      )
      .max(ADMIN_TOOL_CHANGES_MAX)
      .optional(),
  })
  .refine(
    (body) =>
      body.globallyEnabled !== undefined ||
      body.featured !== undefined ||
      (body.tools !== undefined && body.tools.length > 0),
    { message: 'at least one change is required' },
  );

export const updateSettingsBodySchema = z.strictObject({
  values: z
    .record(z.string().max(64), z.union([z.boolean(), z.number()]))
    .refine((values) => Object.keys(values).length > 0, {
      message: 'at least one setting is required',
    })
    .refine((values) => Object.keys(values).length <= ADMIN_SETTINGS_MAX_KEYS, {
      message: 'too many settings',
    }),
});

export type UpdateAdminCatalogBody = z.infer<typeof updateAdminCatalogBodySchema>;
export type UpdateSettingsBody = z.infer<typeof updateSettingsBodySchema>;
