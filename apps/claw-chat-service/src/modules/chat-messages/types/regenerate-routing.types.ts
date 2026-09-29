import type { RoutingMode } from '../../../generated/prisma';

/** The routing a regeneration publishes: its mode and any forced model. */
export type RegenerateRouting = {
  routingMode: RoutingMode;
  forcedProvider: string | undefined;
  forcedModel: string | undefined;
};
