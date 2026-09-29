import { RoutingMode } from '../../../generated/prisma';
import type { RegenerateMessageDto } from '../dto/regenerate-message.dto';
import type { RegenerateRouting } from '../types/regenerate-routing.types';

/**
 * Which model answers a regeneration.
 *
 * An explicit choice wins: AUTO re-routes with nothing forced, a manual pick
 * forces that model. With no choice the old rule stands — the thread's pinned
 * model, else the mode the turn was first routed with.
 */
export function resolveRegenerateRouting(
  dto: RegenerateMessageDto,
  thread: { preferredProvider: string | null; preferredModel: string | null },
  originalMode: RoutingMode,
): RegenerateRouting {
  if (dto.routingMode === RoutingMode.AUTO) {
    return { routingMode: RoutingMode.AUTO, forcedProvider: undefined, forcedModel: undefined };
  }
  if (dto.routingMode === RoutingMode.MANUAL_MODEL) {
    return {
      routingMode: RoutingMode.MANUAL_MODEL,
      forcedProvider: dto.provider,
      forcedModel: dto.model,
    };
  }
  const forcedProvider = thread.preferredProvider ?? undefined;
  const forcedModel = thread.preferredModel ?? undefined;
  return {
    routingMode:
      forcedProvider !== undefined && forcedModel !== undefined
        ? RoutingMode.MANUAL_MODEL
        : originalMode,
    forcedProvider,
    forcedModel,
  };
}
