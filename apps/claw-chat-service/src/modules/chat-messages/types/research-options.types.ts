import type { ResearchMode } from '../../../common/enums/research-mode.enum';

/**
 * Options passed to `ContextAssemblyManager.assemble` to trigger a
 * research helper step before final answer generation.
 */
export type ResearchOptions = {
  /**
   * Which research workflow to run. NONE means don't call research-service.
   * Uses the canonical {@link ResearchMode} enum (NONE / SEARCH /
   * SEARCH_FETCH / SEARCH_EXTRACT) — chat-service maps each value to the
   * research-service `ResearchWorkflow` dialect at the wire boundary.
   */
  mode: ResearchMode;
  /** Optional provider id (else research-service picks the default). */
  providerId?: string;
  /** Bearer token to forward to research-service (so the run is user-scoped). */
  userToken: string;
  /** Model the user explicitly picked — preserved for the final answer. */
  requestedModel?: string;
  /** Provider the user explicitly picked — preserved for the final answer. */
  requestedProvider?: string;
};
