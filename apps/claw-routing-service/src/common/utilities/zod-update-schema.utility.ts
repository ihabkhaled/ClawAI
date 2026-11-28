import { z } from 'zod';

import type { WithoutDefaults } from '../types/zod-update-schema.types';

/**
 * Every field optional AND without its create-time default. Zod's `.partial()` keeps `.default()`, so a PATCH that
 * names one field would silently reset every defaulted field (isLocal, lifecycle, qualityTier...) to its default.
 */
export function updateSchemaOf<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodObject<WithoutDefaults<T>> {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => {
      const base =
        field instanceof z.ZodDefault ? (field.removeDefault() as z.ZodType) : (field as z.ZodType);
      return [key, base.optional()];
    }),
  );
  return z.object(shape) as unknown as z.ZodObject<WithoutDefaults<T>>;
}
