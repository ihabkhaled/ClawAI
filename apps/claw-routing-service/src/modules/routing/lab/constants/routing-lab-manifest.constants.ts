import { RouterErrorCode } from '../../../../common/enums';

/** Every canonical failure code, in declaration order — the taxonomy table's row set. */
export const ROUTING_LAB_ALL_ROUTER_ERROR_CODES: readonly RouterErrorCode[] =
  Object.values(RouterErrorCode);

/**
 * Fixed prose for the generated manifest, kept out of the renderer so the
 * scope disclaimer cannot silently drift from what the harness actually
 * proves as the code around it changes.
 */
export const ROUTING_LAB_MANIFEST_TITLE =
  'Batch 12 — Cloud Smart Router Lab Evidence (Synthetic Corpus)';

export const ROUTING_LAB_MANIFEST_SCOPE_NOTE =
  "This is the routing lab's first pass: a synthetic corpus run in-process against a " +
  'real `CloudRouterManager` and `RouterInferenceCoordinatorManager`, with every provider ' +
  "adapter fault-injected deterministically. It is NOT the plan's full evidence programme — " +
  '1,000 replay decisions against real history, 100 live provider-fault runs, ' +
  '100 SSE-disruption runs, and 100 browser runs remain separate future work.';

export const ROUTING_LAB_MANIFEST_WHAT_THIS_PROVES: readonly string[] = [
  'Every one of the 15 `RouterErrorCode` values is reachable and observed at least once.',
  'Retries, the single bounded structured-output repair, provider-wide skip, model-scope ' +
    'advance, request-scope hard stop, quarantine reporting, and trigger-gated fallback all ' +
    'behave the way `router-inference-coordinator.manager.ts` documents.',
  'The three config-level decline paths (`NO_PUBLISHED_CONFIGURATION`, ' +
    '`CONFIGURATION_DISABLED`, `NO_RUNNABLE_CHAIN_ENTRY`) and the eligibility decline ' +
    '(`NO_ELIGIBLE_EXECUTION_MODEL`) are each reached explicitly.',
  'The chain survives a 300-case corpus spanning every privacy class, every domain tag, ' +
    'three prompt-length buckets, and a set of structural content edges without an ' +
    'unhandled exception.',
];

export const ROUTING_LAB_MANIFEST_WHAT_THIS_DOES_NOT_PROVE: readonly string[] = [
  'No live provider call was made — every adapter response in this run is scripted.',
  'No real historical traffic was replayed; the corpus is synthetic and deterministic.',
  'No SSE, browser, or end-to-end user-facing path was exercised.',
  'Timing is nominal (10ms per scripted call), so latency-budget interactions near the real ' +
    'deadline are not evidenced by this run.',
];
