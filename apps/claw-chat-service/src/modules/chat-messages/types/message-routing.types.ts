import type { RoutingMode } from '../../../generated/prisma';

/** The routing a new user message resolves to: its mode and any forced model. */
export type ResolvedMessageRouting = {
  effectiveRoutingMode: RoutingMode;
  forcedProvider: string | undefined;
  forcedModel: string | undefined;
};
