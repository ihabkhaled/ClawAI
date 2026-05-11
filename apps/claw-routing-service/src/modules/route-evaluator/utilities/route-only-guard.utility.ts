import { ModelLifecycle } from '../../../generated/prisma';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';

/// Filters the candidate set down to execution-capable, active, non-router-only
/// profiles. This is the *hard* enforcement of the route-only contract:
/// any profile with isRouterOnly=true is dropped here before scoring even sees it.
export function applyRouteOnlyContract(
  candidates: RouterModelRegistryRecord[],
): RouterModelRegistryRecord[] {
  return candidates.filter(
    (c) =>
      !c.isRouterOnly &&
      c.isExecutionCapable &&
      c.lifecycle === ModelLifecycle.ACTIVE,
  );
}
