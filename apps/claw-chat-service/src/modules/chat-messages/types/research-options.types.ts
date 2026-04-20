import type { ResearchMode } from '../dto/create-message.dto';

/**
 * Options passed to `ContextAssemblyManager.assemble` to trigger a
 * research helper step before final answer generation.
 */
export type ResearchOptions = {
  /** Which research workflow to run; OFF means don't call research-service. */
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
