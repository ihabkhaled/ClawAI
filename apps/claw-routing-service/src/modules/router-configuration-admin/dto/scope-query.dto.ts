import { z } from 'zod';
import { ROUTER_CONFIGURATION_GLOBAL_SCOPE } from '../../routing/constants/router-chain.constants';

/** Shared by endpoints that act on "the" configuration for a scope rather
 * than on a specific revision id (enable/disable). */
export const scopeQuerySchema = z
  .object({
    scope: z.string().min(1).max(100).default(ROUTER_CONFIGURATION_GLOBAL_SCOPE),
  })
  .strict();

export type ScopeQueryDto = z.infer<typeof scopeQuerySchema>;
