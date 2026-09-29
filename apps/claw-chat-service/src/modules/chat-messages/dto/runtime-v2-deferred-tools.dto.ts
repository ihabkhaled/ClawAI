import { z } from 'zod';

import { RUNTIME_V2_ID_PATTERN } from '../constants/runtime-v2.constants';
import { RUNTIME_V2_DEFERRED_LOAD_MAX_DEFINITIONS } from '../constants/runtime-v2-deferred-tools.constants';
import { toolDefinitionSchema } from './runtime-v2.dto';

/**
 * Body of `POST chat-messages/runtime/runs/:runId/tools`.
 *
 * Carries FULL definitions only: a stub (`deferred` present) is refused here,
 * because loading a stub would replace a commitment with another commitment.
 */
export const runtimeDeferredToolLoadSchema = z
  .object({
    generation: z.string().regex(RUNTIME_V2_ID_PATTERN),
    definitions: z
      .array(
        toolDefinitionSchema.refine((definition) => definition.deferred === undefined, {
          message: 'A loaded definition must be the full definition, not a deferred stub',
        }),
      )
      .min(1)
      .max(RUNTIME_V2_DEFERRED_LOAD_MAX_DEFINITIONS),
  })
  .strict();

export type RuntimeDeferredToolLoadDto = z.infer<typeof runtimeDeferredToolLoadSchema>;
