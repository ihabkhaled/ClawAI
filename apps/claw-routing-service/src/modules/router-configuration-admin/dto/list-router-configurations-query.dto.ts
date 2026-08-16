import { z } from 'zod';
import { RouterConfigurationStatus } from '../../../generated/prisma';
import { ROUTER_CONFIGURATION_GLOBAL_SCOPE } from '../../routing/constants/router-chain.constants';

export const listRouterConfigurationsQuerySchema = z
  .object({
    scope: z.string().min(1).max(100).default(ROUTER_CONFIGURATION_GLOBAL_SCOPE),
    status: z.nativeEnum(RouterConfigurationStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type ListRouterConfigurationsQueryDto = z.infer<typeof listRouterConfigurationsQuerySchema>;
