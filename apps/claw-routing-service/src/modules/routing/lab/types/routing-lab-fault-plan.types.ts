import type { RouterErrorCode } from '../../../../common/enums';
import type { RouterProvider } from '../../../../generated/prisma';

/**
 * One scripted response for one call to a fault-injected provider adapter.
 *
 * `FAULT` covers all 15 `RouterErrorCode` values uniformly: for the 13 codes
 * an adapter can return directly, the injector returns `ok:false` with that
 * code; for `MALFORMED_STRUCTURED_OUTPUT` and `LOW_CONFIDENCE` — which are
 * never returned by an adapter, only produced by the coordinator's own
 * validation — the injector instead fabricates the `ok:true` response that
 * provokes that reclassification. Callers author every code the same way and
 * never need to know which of the two mechanics produced it.
 */
export type RoutingLabProviderStep =
  | { readonly outcome: 'FAULT'; readonly code: RouterErrorCode }
  | {
      readonly outcome: 'SUCCESS';
      /** Defaults to the fixture chain's first resolvable entry for this provider. */
      readonly deploymentId?: string;
      readonly workflow?: string;
      readonly confidence?: number;
    };

/**
 * Per-provider queue of scripted responses, consumed in order. A provider
 * absent from the plan — or whose queue is exhausted — always succeeds with
 * the chain's default deployment for it, matching the coordinator spec's
 * `fakeProvider` convention of repeating the last scripted response.
 */
export type RoutingLabFaultPlan = Readonly<
  Partial<Record<RouterProvider, readonly RoutingLabProviderStep[]>>
>;
