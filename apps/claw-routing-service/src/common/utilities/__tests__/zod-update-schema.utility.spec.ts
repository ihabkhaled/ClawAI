import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { updateRouterModelSchema } from '../../../modules/router-models/dto/update-router-model.dto';
import { updateSchemaOf } from '../zod-update-schema.utility';

describe('updateSchemaOf', () => {
  const create = z.object({
    name: z.string(),
    isLocal: z.boolean().default(false),
    tier: z.enum(['A', 'B']).default('B'),
  });

  it('leaves out every field the body does not name, defaults included', () => {
    expect(updateSchemaOf(create).parse({ name: 'x' })).toEqual({ name: 'x' });
    expect(updateSchemaOf(create).parse({})).toEqual({});
  });

  it('still validates the fields the body names', () => {
    expect(updateSchemaOf(create).parse({ tier: 'A', isLocal: true })).toEqual({
      tier: 'A',
      isLocal: true,
    });
    expect(updateSchemaOf(create).safeParse({ tier: 'C' }).success).toBe(false);
  });

  it('keeps a router-model PATCH from resetting isLocal, lifecycle and qualityTier', () => {
    const parsed = updateRouterModelSchema.parse({ notes: 'checked' });
    expect(parsed).toEqual({ notes: 'checked' });
    expect(parsed).not.toHaveProperty('isLocal');
    expect(parsed).not.toHaveProperty('lifecycle');
    expect(parsed).not.toHaveProperty('qualityTier');
  });
});
