import { RoutingMode } from '../../../generated/prisma';
import { RUNTIME_V2_AUTO_ROUTE_SENTINEL } from '../constants/runtime-v2-routing.constants';
import { type RuntimeV2RoutingSelection } from '../types/runtime-v2-routing.types';

export function isAutoRouteSentinel(value: string): boolean {
  return value.trim().toUpperCase() === RUNTIME_V2_AUTO_ROUTE_SENTINEL;
}

/**
 * Runtime V2 used to publish every start as `MANUAL_MODEL` with the client's
 * provider and model forced verbatim. When the client asked for automatic
 * routing it sends the `AUTO` sentinel, so the platform pinned a connector
 * literally named `AUTO`, the connector lookup failed, and the run terminated
 * before the model was ever called. A sentinel on either half means "route".
 */
export function resolveRuntimeRouting(provider: string, model: string): RuntimeV2RoutingSelection {
  if (isAutoRouteSentinel(provider) || isAutoRouteSentinel(model)) {
    return { routingMode: RoutingMode.AUTO };
  }
  return {
    routingMode: RoutingMode.MANUAL_MODEL,
    provider,
    model,
    allowedModels: [`${provider}/${model}`],
  };
}
