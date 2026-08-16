import { z } from 'zod';
import { ROUTER_CONFIGURATION_GLOBAL_SCOPE } from '../../routing/constants/router-chain.constants';

/** Body for creating a new DRAFT revision. See
 * `RouterConfigurationRepository.createDraft` for the copy-on-write decision:
 * the draft is seeded from the scope's currently PUBLISHED revision when one
 * exists, or starts empty otherwise — there is nothing else for the caller to
 * choose here. */
export const createRouterConfigurationSchema = z
  .object({
    scope: z.string().min(1).max(100).default(ROUTER_CONFIGURATION_GLOBAL_SCOPE),
  })
  .strict();

export type CreateRouterConfigurationDto = z.infer<typeof createRouterConfigurationSchema>;
